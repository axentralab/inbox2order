/**
 * AI Order Info Extractor
 * Extracts phone, address, product, name from Bengali/English messages
 * Uses regex patterns tuned for Bangladeshi F-commerce messages
 */

function extractOrderInfo(text) {
  if (!text) return {};

  const result = {
    name: null,
    phone: null,
    address: null,
    product: null,
    quantity: null,
    size: null,
    color: null,
    confidence: 0
  };

  let confidence = 0;

  // --- PHONE NUMBER ---
  // BD numbers: 01X-XXXXXXXX (with/without spaces, dashes)
  const phonePatterns = [
    /(?:01[3-9]\d{8})/g,
    /(?:01[3-9]\d{2}[-\s]\d{6})/g,
    /(?:01[3-9]\d{2}[-\s]\d{3}[-\s]\d{3})/g,
    /(?:\+880\s?1[3-9]\d{8})/g,
  ];
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.phone = match[0].replace(/[\s-]/g, '').replace('+880', '0');
      confidence += 30;
      break;
    }
  }

  // --- ADDRESS ---
  // Common BD districts and keywords
  const districts = [
    'dhaka','chittagong','sylhet','rajshahi','khulna','barisal','rangpur','mymensingh',
    'comilla','gazipur','narayanganj','narsingdi','tangail','manikganj','munshiganj',
    'uttara','mirpur','dhanmondi','mohammadpur','gulshan','banani','motijheel','rampura',
    'badda','khilgaon','demra','jatrabari','lalbagh','hazaribagh','mohakhali','tejgaon'
  ];
  const addressKeywords = /address[:\s]+(.+?)(?:\n|phone|product|$)|ঠিকানা[:\s]+(.+?)(?:\n|ফোন|$)|বাসা[:\s]+(.+?)(?:\n|$)/i;
  const addrMatch = text.match(addressKeywords);
  if (addrMatch) {
    result.address = (addrMatch[1] || addrMatch[2] || addrMatch[3])?.trim();
    confidence += 25;
  } else {
    // Detect by district name presence
    const lowerText = text.toLowerCase();
    for (const district of districts) {
      if (lowerText.includes(district)) {
        // Extract context around district name
        const idx = lowerText.indexOf(district);
        result.address = text.substring(Math.max(0, idx - 20), idx + 40).trim();
        confidence += 15;
        break;
      }
    }
  }

  // --- NAME ---
  const nameKeywords = /(?:name|নাম|আমার নাম|ami)[:\s]+([^\n,]+)/i;
  const nameMatch = text.match(nameKeywords);
  if (nameMatch) {
    result.name = nameMatch[1]?.trim();
    confidence += 20;
  }

  // --- PRODUCT ---
  const productKeywords = /(?:product|item|পণ্য|কি নিবো|order|অর্ডার)[:\s]+([^\n,]+)/i;
  const productMatch = text.match(productKeywords);
  if (productMatch) {
    result.product = productMatch[1]?.trim();
    confidence += 15;
  }

  // --- SIZE ---
  const sizeMatch = text.match(/\b(xs|s|m|l|xl|xxl|2xl|3xl|\d{2,3}\s*cm|\d{1,2}\s*size)\b/i);
  if (sizeMatch) {
    result.size = sizeMatch[0].toUpperCase();
    confidence += 5;
  }

  // --- COLOR ---
  const colors = ['red','blue','green','black','white','pink','yellow','orange','purple',
    'brown','grey','gray','navy','maroon','লাল','নীল','সবুজ','কালো','সাদা','গোলাপি'];
  for (const color of colors) {
    if (text.toLowerCase().includes(color)) {
      result.color = color;
      confidence += 5;
      break;
    }
  }

  // --- QUANTITY ---
  const qtyMatch = text.match(/(\d+)\s*(?:ta|টা|pcs|piece|pieces|টি)/i);
  if (qtyMatch) {
    result.quantity = parseInt(qtyMatch[1]);
    confidence += 5;
  }

  result.confidence = Math.min(confidence, 100);
  return result;
}

module.exports = { extractOrderInfo };
