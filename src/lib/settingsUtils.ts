export const PUBLIC_SETTING_KEYS = new Set([
  'site_name', 'site_description', 'site_logo', 'site_favicon', 'site_url',
  'contact_phone', 'contact_email', 'contact_address',
  'seo_title', 'seo_description', 'seo_keywords',
  'social_facebook', 'social_instagram', 'social_youtube', 'social_tiktok',
  'zalo_oa_id', 'zalo_phone', 'zalo_welcome', 'chat_zalo_icon',
  'chat_messenger_icon', 'messenger_page_id',
  'hero_image', 'hero_image_mobile', 'hero_title', 'hero_subtitle',
  'hero_cta_text', 'hero_tag', 'hero_overlay', 'hero_text_color', 'hero_desc_color',
  'homepage_testimonial_1_image', 'homepage_testimonial_2_image', 'homepage_testimonial_3_image',
  'homepage_style_collection', 'homepage_collections_eyebrow',
  'homepage_collections_title', 'homepage_collections_description', 'homepage_collections_cta',
  'stat_customers', 'stat_products', 'stat_brands', 'stat_rating',
  'brand_color',
  'custom_font_name', 'custom_font_url', 'custom_font_format', 'custom_font_enabled',
  'footer_menus', 'footer_bottom_links', 'footer_privacy_url', 'footer_terms_url',
  'footer_show_social', 'footer_show_menus', 'footer_show_contact',
  'footer_opening_hours', 'footer_description', 'footer_copyright',
  'footer_show_business_registration', 'footer_business_registration_html',
  'about_seo_title', 'about_seo_description', 'about_seo_keywords',
  'about_banner', 'about_title', 'about_content', 'about_faqs',
  'payment_free_shipping_threshold', 'payment_shipping_fee',
]);

const CREDENTIAL_MARKER = /-----BEGIN\s+(?:[A-Z0-9 ]+\s+)?PRIVATE KEY-----|["']private_key["']\s*[:=]|["']type["']\s*:\s*["']service_account["']/i;

export function flattenSettings(data: any): Record<string, string> {
  const flat: Record<string, string> = {};
  if (data && typeof data === 'object') {
    Object.values(data).forEach((group: any) => {
      if (typeof group === 'object') {
        Object.entries(group).forEach(([key, value]) => {
          if (PUBLIC_SETTING_KEYS.has(key) && typeof value === 'string' && !CREDENTIAL_MARKER.test(value)) {
            flat[key] = value;
          }
        });
      }
    });
  }
  return flat;
}
