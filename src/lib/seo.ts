import { Metadata } from 'next';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
}

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Glass Eyewear';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function generateMeta({
  title,
  description,
  keywords,
  ogImage,
  url,
  type = 'website',
}: SEOProps): Metadata {
  const fullTitle = `${title} | ${APP_NAME}`;
  const fullUrl = url ? `${APP_URL}${url}` : APP_URL;
  const imageUrl = ogImage || `${APP_URL}/og-default.jpg`;

  return {
    title: fullTitle,
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: APP_NAME,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      locale: 'vi_VN',
      type: type === 'product' ? 'website' : type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: fullUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// Schema.org Product structured data
export function generateProductSchema(product: {
  name: string;
  description: string;
  image: string[];
  sku?: string;
  brand?: string;
  price: number;
  salePrice?: number;
  url: string;
  inStock: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : undefined,
    offers: {
      '@type': 'Offer',
      url: `${APP_URL}${product.url}`,
      priceCurrency: 'VND',
      price: product.salePrice || product.price,
      priceValidUntil: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0],
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

// Schema.org Article structured data
export function generateArticleSchema(article: {
  title: string;
  description: string;
  image?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image,
    author: {
      '@type': 'Person',
      name: article.author || APP_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: APP_NAME,
      logo: { '@type': 'ImageObject', url: `${APP_URL}/logo.png` },
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${APP_URL}${article.url}`,
    },
  };
}

// Schema.org Organization
export function generateOrganizationSchema(settings: {
  name: string;
  description: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.name,
    description: settings.description,
    url: APP_URL,
    logo: settings.logo || `${APP_URL}/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: settings.phone,
      email: settings.email,
      contactType: 'customer service',
      areaServed: 'VN',
      availableLanguage: 'Vietnamese',
    },
    address: settings.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: settings.address,
          addressCountry: 'VN',
        }
      : undefined,
  };
}

// Schema.org BreadcrumbList
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${APP_URL}${item.url}`,
    })),
  };
}

// Google Merchant Listing structured data
export function generateMerchantListing(product: {
  name: string;
  description: string;
  image: string[];
  sku?: string;
  brand?: string;
  price: number;
  salePrice?: number;
  url: string;
  inStock: boolean;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    gtin: undefined,
    mpn: product.sku,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : undefined,
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: `${APP_URL}${product.url}`,
      priceCurrency: 'VND',
      price: product.salePrice || product.price,
      priceValidUntil: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0],
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: APP_NAME,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'VN',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'VN',
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 30,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  };
}

// Schema.org FAQPage
export function generateFAQSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Schema.org LocalBusiness (from API settings)
export function generateLocalBusinessSchema(settings: {
  name: string;
  description?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: string[];
  priceRange?: string;
  geo?: { lat: number; lng: number };
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${APP_URL}/#business`,
    name: settings.name,
    description: settings.description,
    url: APP_URL,
    logo: settings.logo || `${APP_URL}/logo.png`,
    image: settings.logo || `${APP_URL}/logo.png`,
    telephone: settings.phone,
    email: settings.email,
    priceRange: settings.priceRange || '₫₫',
    address: settings.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: settings.address,
          addressCountry: 'VN',
          addressLocality: 'Việt Nam',
        }
      : undefined,
    geo: settings.geo
      ? {
          '@type': 'GeoCoordinates',
          latitude: settings.geo.lat,
          longitude: settings.geo.lng,
        }
      : undefined,
    openingHoursSpecification: settings.openingHours?.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '08:00',
      closes: '21:00',
    })),
  };
}

// Schema.org WebSite with SearchAction
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_NAME,
    url: APP_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${APP_URL}/san-pham?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// Schema.org CollectionPage (for listing pages)
export function generateCollectionPageSchema(page: {
  name: string;
  description: string;
  url: string;
  itemCount?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    description: page.description,
    url: `${APP_URL}${page.url}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: page.itemCount,
    },
  };
}

