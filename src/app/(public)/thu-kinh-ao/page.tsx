import { Metadata } from 'next';
import Link from 'next/link';
import VirtualTryOnClient from './VirtualTryOnClient';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn').replace(/\/$/, '');
const PAGE_TITLE = 'Thử Kính Online Bằng AI Trên Khuôn Mặt | MITOO';
const PAGE_DESCRIPTION = 'Thử kính online miễn phí với MITOO: chụp hoặc tải ảnh khuôn mặt, chọn gọng kính yêu thích và xem hình ảnh mô phỏng bằng AI trước khi quyết định mua.';

const faqItems = [
  {
    question: 'Thử kính online tại MITOO có cần cài ứng dụng không?',
    answer: 'Không. Bạn có thể sử dụng trực tiếp trên trình duyệt hỗ trợ của điện thoại hoặc máy tính. Chỉ cần chụp ảnh hoặc tải ảnh khuôn mặt để bắt đầu.',
  },
  {
    question: 'MITOO thử kính online bằng cách nào?',
    answer: 'Bạn chọn ảnh khuôn mặt và mẫu gọng kính. Hệ thống sử dụng Gemini AI để tạo hình ảnh mô phỏng gọng kính trên khuôn mặt nhằm hỗ trợ bạn tham khảo trước khi chọn mua.',
  },
  {
    question: 'Ảnh thử kính bằng AI có giống hoàn toàn ngoài đời không?',
    answer: 'Không nên xem ảnh AI là mô phỏng chính xác tuyệt đối. Kết quả giúp tham khảo kiểu dáng; kích thước thực tế, màu sắc và cảm giác đeo còn phụ thuộc sản phẩm và khuôn mặt thực tế.',
  },
  {
    question: 'Tôi có thể thử nhiều gọng kính khác nhau không?',
    answer: 'Có. Sau khi chọn ảnh khuôn mặt, bạn có thể xem và lựa chọn các mẫu gọng đang có trên MITOO để tạo kết quả thử kính.',
  },
  {
    question: 'Nên dùng ảnh như thế nào để thử kính rõ hơn?',
    answer: 'Nên dùng ảnh nhìn thẳng, khuôn mặt rõ, đủ ánh sáng và không bị tóc hoặc vật khác che quá nhiều vùng mắt.',
  },
] as const;

const categoryLinks = [
  { href: '/danh-muc/gong-kinh-vuong', label: 'Gọng kính vuông' },
  { href: '/danh-muc/gong-kinh-tron', label: 'Gọng kính tròn' },
  { href: '/danh-muc/gong-kinh-mat-meo', label: 'Gọng kính mắt mèo' },
  { href: '/danh-muc/gong-kinh-panto', label: 'Gọng kính Panto' },
  { href: '/danh-muc/gong-kinh-da-giac', label: 'Gọng kính đa giác' },
] as const;

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: '/thu-kinh-ao',
  },
};

export default function VirtualTryOnPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${APP_URL}/thu-kinh-ao#webpage`,
        url: `${APP_URL}/thu-kinh-ao`,
        name: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        isPartOf: { '@id': `${APP_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: APP_URL },
          { '@type': 'ListItem', position: 2, name: 'Thử kính online', item: `${APP_URL}/thu-kinh-ao` },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqItems.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };

  return (
    <>
      <VirtualTryOnClient />

      <main className="container tryon-seo-content" aria-labelledby="tryon-seo-title">
        <section className="tryon-seo-content__section">
          <p className="tryon-seo-content__eyebrow">MITOO · THỬ KÍNH ONLINE</p>
          <h2 id="tryon-seo-title">Thử kính online tại MITOO hoạt động như thế nào?</h2>
          <p>
            Công cụ thử kính online của MITOO giúp bạn hình dung kiểu gọng trên khuôn mặt bằng một quy trình ngắn gọn. Bạn chỉ cần chuẩn bị ảnh, chọn gọng kính và xem hình ảnh mô phỏng do Gemini AI tạo ra.
          </p>
          <ol className="tryon-seo-content__steps">
            <li><strong>Chụp hoặc tải ảnh khuôn mặt:</strong> dùng ảnh rõ, đủ sáng từ điện thoại hoặc máy tính.</li>
            <li><strong>Chọn gọng kính yêu thích:</strong> duyệt các mẫu đang có trên MITOO và chọn màu nếu sản phẩm hỗ trợ.</li>
            <li><strong>Xem hình ảnh mô phỏng bằng Gemini AI:</strong> hệ thống kết hợp ảnh khuôn mặt và ảnh gọng để tạo kết quả tham khảo.</li>
          </ol>
          <p className="tryon-seo-content__note">
            Hình ảnh thử kính bằng AI mang tính mô phỏng để hỗ trợ lựa chọn kiểu dáng. Màu sắc, tỷ lệ và cảm giác đeo thực tế có thể khác tùy sản phẩm và thiết bị.
          </p>
        </section>

        <section className="tryon-seo-content__section">
          <h2>Vì sao nên thử kính online trước khi chọn gọng?</h2>
          <p>
            Khi xem ảnh sản phẩm riêng lẻ, đôi khi bạn khó hình dung gọng kính trên chính khuôn mặt của mình. Thử kính online giúp bạn so sánh nhiều mẫu nhanh hơn, thu hẹp lựa chọn trước khi mua và mạnh dạn khám phá những kiểu gọng mới.
          </p>
        </section>

        <section className="tryon-seo-content__section">
          <h2>Bạn có thể thử những kiểu gọng kính nào?</h2>
          <p>Khám phá các kiểu gọng theo dáng kính, sau đó chọn mẫu bạn thích để thử bằng AI trên khuôn mặt.</p>
          <nav className="tryon-seo-content__links" aria-label="Danh mục kính MITOO">
            {categoryLinks.map((category) => (
              <Link key={category.href} href={category.href}>{category.label}</Link>
            ))}
          </nav>
        </section>

        <section className="tryon-seo-content__section">
          <h2>Chọn kính theo dáng khuôn mặt</h2>
          <div className="tryon-seo-content__face-grid">
            <div><h3>Khuôn mặt tròn</h3><p>Gọng có đường nét rõ như vuông hoặc chữ nhật thường tạo thêm tương phản, nhưng đây chỉ là điểm bắt đầu để bạn tự so sánh.</p></div>
            <div><h3>Khuôn mặt vuông</h3><p>Các thiết kế bo tròn, oval hoặc Panto có thể tạo cảm giác mềm mại hơn.</p></div>
            <div><h3>Khuôn mặt dài</h3><p>Có thể thử các mẫu có chiều cao tròng rõ và form cân đối với tổng thể khuôn mặt.</p></div>
            <div><h3>Khuôn mặt trái xoan</h3><p>Phù hợp với nhiều kiểu dáng; nên thử trực tiếp nhiều form để so sánh phong cách.</p></div>
          </div>
          <Link className="btn btn-primary tryon-seo-content__cta" href="#try-on-workspace">Thử các kiểu gọng trên khuôn mặt của bạn <span aria-hidden="true">→</span></Link>
        </section>

        <section className="tryon-seo-content__section tryon-seo-content__faq" aria-labelledby="tryon-faq-title">
          <h2 id="tryon-faq-title">Câu hỏi thường gặp về thử kính online</h2>
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
