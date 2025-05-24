import { PriceHistoryItem, Product } from "@/types";

const Notification = {
  WELCOME: 'WELCOME',
  CHANGE_OF_STOCK: 'CHANGE_OF_STOCK',
  LOWEST_PRICE: 'LOWEST_PRICE',
  THRESHOLD_MET: 'THRESHOLD_MET',
}

const THRESHOLD_PERCENTAGE = 40;

// Extracts and returns the price from a list of possible elements.
export function extractPrice(...elements: any) {
  for (const element of elements) {
    const priceText = element.text().trim();

    if(priceText) {
      const cleanPrice = priceText.replace(/[^\d.]/g, '');

      let firstPrice; 

      if (cleanPrice) {
        firstPrice = cleanPrice.match(/\d+\.\d{2}/)?.[0];
      } 

      return firstPrice || cleanPrice;
    }
  }

  return '';
}

// Extracts and returns the currency symbol from an element.
export function extractCurrency(element: any) {
  const currencyText = element.text().trim().slice(0, 1);
  return currencyText ? currencyText : "";
}

// Extracts description from two possible elements from amazon

export function extractDescription($: any): string { // Using 'any' to match your original signature
  let descriptionContent = '';

  // --- Priority 1: Try the dedicated product description section ---
  // This section usually contains the main narrative description in <p> tags.
  const productDescContainer = $('#productDescription');
  if (productDescContainer.length > 0) {
    const paragraphs = productDescContainer.find('p');
    if (paragraphs.length > 0) {
      descriptionContent = paragraphs
        .map((_: any, el: any) => $(el).text().trim()) // Extract text from each paragraph and trim
        .get()                                        // Convert to an array of strings
        .filter((text: string) => text.length > 0)    // Remove any empty strings
        .join('\n');                                  // Join paragraphs with a newline
    } else {
      // Fallback if no <p> tags, take all text from #productDescription
      descriptionContent = productDescContainer.text().trim();
    }
  }

  // --- Priority 2: Try feature bullets if main description is missing or seems too short ---
  // These are typically the "About this item" bullet points.
  // We use a heuristic (e.g., length < 100 characters) to decide if the primary description was substantial enough.
  if (!descriptionContent || descriptionContent.length < 100) {
    const featureBulletItems = $('#feature-bullets .a-list-item');
    if (featureBulletItems.length > 0) {
      const bulletsText = featureBulletItems
        .map((_: any, el: any) => $(el).text().trim())
        .get()
        .filter((text: string) => text.length > 0)
        .join('\n'); // Each bullet point on a new line

      if (bulletsText.length > 0) {
        // If the main description was very short or non-existent,
        // replace it with the bullet points.
        // Alternatively, you could append bullets to a short existing description.
        if (!descriptionContent || descriptionContent.length < 20) { // If truly minimal or empty
             descriptionContent = bulletsText;
        } else if (descriptionContent) {
            // Option: Append if some description already exists but was deemed short
            // descriptionContent += '\n\nKey Features:\n' + bulletsText;

            // For now, if the primary description was short (but not empty) and bullets are found,
            // we'll prefer bullets if they are more substantial or if primary was lacking.
            // This choice depends on desired behavior. Let's overwrite if primary was short.
            descriptionContent = bulletsText;
        }
      }
    }
  }

  // --- Fallback: If no specific description found yet, use your original selectors ---
  // This ensures that if the common IDs are not present, we still try to find a description.
  if (!descriptionContent || descriptionContent.length === 0) {
    const originalSelectors = [
      ".a-unordered-list .a-list-item", // Could be #feature-bullets or another list
      ".a-expander-content p",          // Paragraphs in expandable sections
    ];

    for (const selector of originalSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        const fallbackText = elements
          .map((_: any, element: any) => $(element).text().trim())
          .get()
          .filter((text: string) => text.length > 0)
          .join("\n");
        
        if (fallbackText.length > 0) {
          descriptionContent = fallbackText;
          break; // Found content from one of the fallback selectors
        }
      }
    }
  }

  // Final cleanup: remove excessive newlines and trim leading/trailing whitespace
  if (descriptionContent) {
    return descriptionContent.replace(/\n\s*\n+/g, '\n').trim();
  }

  return ""; // Return empty string if no description was found
}

export function getHighestPrice(priceList: PriceHistoryItem[]) {
  let highestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price > highestPrice.price) {
      highestPrice = priceList[i];
    }
  }

  return highestPrice.price;
}

export function getLowestPrice(priceList: PriceHistoryItem[]) {
  let lowestPrice = priceList[0];

  for (let i = 0; i < priceList.length; i++) {
    if (priceList[i].price < lowestPrice.price) {
      lowestPrice = priceList[i];
    }
  }

  return lowestPrice.price;
}

export function getAveragePrice(priceList: PriceHistoryItem[]) {
  const sumOfPrices = priceList.reduce((acc, curr) => acc + curr.price, 0);
  const averagePrice = sumOfPrices / priceList.length || 0;

  return averagePrice;
}

export const getEmailNotifType = (
  scrapedProduct: Product,
  currentProduct: Product
) => {
  const lowestPrice = getLowestPrice(currentProduct.priceHistory);

  if (scrapedProduct.currentPrice < lowestPrice) {
    return Notification.LOWEST_PRICE as keyof typeof Notification;
  }
  if (!scrapedProduct.isOutOfStock && currentProduct.isOutOfStock) {
    return Notification.CHANGE_OF_STOCK as keyof typeof Notification;
  }
  if (scrapedProduct.discountRate >= THRESHOLD_PERCENTAGE) {
    return Notification.THRESHOLD_MET as keyof typeof Notification;
  }

  return null;
};

export const formatNumber = (num: number = 0) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
