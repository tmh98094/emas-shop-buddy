import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  type?: "website" | "product" | "article";
}

export function SEOHead({
  title,
  description,
  keywords,
  ogImage = "/og-image.jpg",
  canonical,
  type = "website",
}: SEOHeadProps) {
  const siteName = "JJ Emas";
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`;
  const siteUrl = window.location.origin;
  const canonicalUrl = canonical || window.location.href;

  return (
    <Helmet prioritizeSeoTags>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_MY" />
      <meta property="og:locale:alternate" content="zh_CN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />
      
      {/* Additional */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content={siteName} />
      <meta name="geo.region" content="MY" />
      <meta name="geo.placename" content="Malaysia" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Structured Data - Organization Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "JewelryStore",
          "name": "JJ Emas",
          "description": "Malaysia & Singapore's Favorite Gold Jewelry Store offering 916 and 999 gold jewelry",
          "url": siteUrl,
          "logo": `${siteUrl}/logo.png`,
          "image": `${siteUrl}${ogImage}`,
          "priceRange": "$$",
          "areaServed": [
            {
              "@type": "Country",
              "name": "Malaysia"
            },
            {
              "@type": "Country",
              "name": "Singapore"
            }
          ],
          "paymentAccepted": "Cash, Credit Card, Touch 'n Go",
          "currenciesAccepted": "MYR, SGD"
        })}
      </script>
    </Helmet>
  );
}
