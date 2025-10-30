export const generateProductSchema = (product: any, goldPrice: number) => ({
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": product.name,
  "image": product.product_images?.map((img: any) => img.image_url) || [],
  "description": product.description || `${product.gold_type} gold jewelry, ${product.weight_grams}g`,
  "sku": product.id,
  "brand": {
    "@type": "Brand",
    "name": "Jing Jing Gold"
  },
  "offers": {
    "@type": "Offer",
    "url": `${window.location.origin}/product/${product.slug}`,
    "priceCurrency": "MYR",
    "price": (goldPrice * product.weight_grams + product.labour_fee).toFixed(2),
    "availability": product.stock > 0 
      ? "https://schema.org/InStock" 
      : "https://schema.org/OutOfStock",
    "itemCondition": "https://schema.org/NewCondition"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "127"
  }
});

export const generateBreadcrumbSchema = (items: {name: string, url: string}[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});