<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;
use JsonException;

class AboutPageSeeder extends Seeder
{
    /**
     * Seed the existing settings-driven /gioi-thieu page.
     *
     * @throws JsonException
     */
    public function run(): void
    {
        $settings = [
            'about_seo_title' => 'Giới thiệu Kính Mắt MITOO | Gọng kính và Tròng kính',
            'about_seo_description' => 'Kính Mắt MITOO tại Yên Phong, Bắc Ninh chuyên gọng kính thời trang, kính cận, kính râm, tròng kính chính hãng và trải nghiệm thử kính ảo AI.',
            'about_seo_keywords' => 'Kính Mắt MITOO, cửa hàng kính mắt Bắc Ninh, kính mắt Yên Phong, gọng kính thời trang, kính cận, kính râm, tròng kính chính hãng, đo mắt tại Bắc Ninh, thử kính AI',
            'about_title' => 'Giới thiệu Kính Mắt MITOO',
            'about_content' => $this->content(),
            'about_faqs' => $this->faqs(),
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'group' => 'about']
            );
        }
    }

    private function content(): string
    {
        return <<<'HTML'
<p><strong>Kính Mắt MITOO là cửa hàng kính mắt tại Yên Phong, Bắc Ninh, chuyên cung cấp gọng kính thời trang, kính cận, kính râm, kính đổi màu, tròng kính và các dịch vụ chăm sóc kính mắt. MITOO đồng thời phát triển trải nghiệm thử kính ảo bằng trí tuệ nhân tạo trên website mitoo.vn, giúp khách hàng dễ dàng lựa chọn kiểu kính phù hợp trước khi mua.</strong></p>
<p>Với tinh thần <strong>“Bạn đẹp, tôi cũng vậy”</strong>, MITOO mong muốn mỗi chiếc kính không chỉ giúp người đeo nhìn rõ hơn mà còn trở thành một phần tự nhiên trong phong cách, cá tính và hình ảnh của mỗi người.</p>

<h2>MITOO – Khi kính mắt trở thành một phần của phong cách</h2>
<p>Một chiếc kính phù hợp cần đáp ứng nhiều yếu tố: đúng nhu cầu sử dụng, vừa vặn với khuôn mặt, thoải mái khi đeo và hài hòa với phong cách cá nhân.</p>
<p>Đó cũng là định hướng mà Kính Mắt MITOO theo đuổi. Thay vì chỉ tập trung vào một nhóm sản phẩm, MITOO xây dựng danh mục kính mắt đa dạng dành cho cả nam và nữ, từ những thiết kế tối giản, thanh lịch đến các mẫu trẻ trung, hiện đại và cá tính.</p>
<p>Khách hàng có thể tìm thấy tại MITOO nhiều kiểu dáng phổ biến như:</p>
<ul>
  <li>Gọng kính vuông và vuông bo góc;</li>
  <li>Gọng tròn, oval và panto;</li>
  <li>Gọng mắt mèo dành cho phong cách nữ tính, nổi bật;</li>
  <li>Gọng đa giác và lục giác hiện đại;</li>
  <li>Gọng kim loại thanh mảnh;</li>
  <li>Gọng nhựa TR90 nhẹ và linh hoạt;</li>
  <li>Gọng titanium và beta titanium;</li>
  <li>Gọng nửa viền, browline và các thiết kế unisex;</li>
  <li>Kính dành cho khuôn mặt nhỏ, khuôn mặt lớn và nhiều dáng mặt khác nhau.</li>
</ul>
<p>MITOO thường xuyên cập nhật sản phẩm và sắp xếp kính theo danh mục, kiểu dáng và phong cách để khách hàng dễ dàng tìm kiếm lựa chọn phù hợp.</p>

<h2>Các sản phẩm và dịch vụ tại Kính Mắt MITOO</h2>

<h3>Gọng kính thời trang</h3>
<p>MITOO cung cấp nhiều mẫu gọng kính dành cho nhu cầu học tập, làm việc, di chuyển và sử dụng hằng ngày. Mỗi thiết kế được lựa chọn dựa trên sự cân bằng giữa kiểu dáng, chất liệu, trọng lượng và khả năng phối hợp với khuôn mặt.</p>
<p>Khách hàng có thể lựa chọn các phong cách thanh lịch, hiện đại, cá tính hoặc tối giản tùy theo sở thích và môi trường sử dụng.</p>

<h3>Kính cận và cắt kính theo yêu cầu</h3>
<p>Đối với khách hàng cần kính điều chỉnh thị lực, MITOO hỗ trợ tư vấn gọng kính, lựa chọn tròng kính và cắt kính theo thông số phù hợp.</p>
<p>Quá trình tư vấn không chỉ tập trung vào độ kính mà còn xem xét thói quen sử dụng, thời gian đeo kính, công việc, môi trường ánh sáng và nhu cầu nhìn gần hoặc nhìn xa của từng khách hàng.</p>

<h3>Tròng kính</h3>
<p>MITOO hỗ trợ lắp nhiều loại tròng kính phục vụ các nhu cầu khác nhau như:</p>
<ul>
  <li>Tròng kính cận;</li>
  <li>Tròng kính chống ánh sáng xanh;</li>
  <li>Tròng kính đổi màu;</li>
  <li>Tròng kính chống tia UV;</li>
  <li>Tròng kính có chiết suất phù hợp với từng mức độ;</li>
  <li>Tròng kính sử dụng cho học tập, làm việc và sinh hoạt hằng ngày.</li>
</ul>
<p>Một số thương hiệu tròng kính được MITOO giới thiệu gồm HOGA, CHEMI và Sensei. Loại tròng phù hợp sẽ được tư vấn dựa trên thông số thị lực, loại gọng, nhu cầu sử dụng và ngân sách của khách hàng.</p>

<h3>Kính râm và kính thời trang</h3>
<p>Bên cạnh kính cận, MITOO còn cung cấp kính râm, kính đổi màu và các mẫu kính thời trang dành cho nhu cầu đi đường, du lịch, chụp ảnh hoặc hoàn thiện phong cách cá nhân.</p>
<p>Khách hàng nên lựa chọn kính dựa trên cả hình dáng khuôn mặt, độ vừa vặn và khả năng đáp ứng nhu cầu sử dụng thực tế, thay vì chỉ dựa vào hình thức bên ngoài.</p>

<h3>Đo mắt và tư vấn tại cửa hàng</h3>
<p>Tại cửa hàng, khách hàng được hỗ trợ kiểm tra thị lực, tư vấn chọn gọng, lựa chọn tròng kính và giải đáp những vấn đề liên quan đến việc sử dụng kính.</p>
<p>Đội ngũ MITOO hướng đến cách tư vấn rõ ràng, dễ hiểu, giúp khách hàng biết mình đang lựa chọn loại gọng và tròng kính nào, phù hợp với nhu cầu gì và cần lưu ý điều gì trong quá trình sử dụng.</p>

<h2>Thử kính ảo bằng trí tuệ nhân tạo</h2>
<p>Một trong những điểm khác biệt trong trải nghiệm mua sắm tại mitoo.vn là tính năng <strong>thử kính ảo bằng AI</strong>.</p>
<p>Khách hàng có thể tải ảnh khuôn mặt hoặc sử dụng camera để xem trước một số mẫu kính trên gương mặt của mình. Quy trình thử kính trực tuyến gồm ba bước:</p>
<ol>
  <li>Tải ảnh khuôn mặt hoặc chụp ảnh bằng camera;</li>
  <li>Lựa chọn mẫu kính muốn thử;</li>
  <li>Xem kết quả mô phỏng trước khi quyết định.</li>
</ol>
<p>Tính năng này giúp khách hàng tham khảo nhanh kiểu dáng, kích thước và phong cách của sản phẩm ngay tại nhà. Kết quả thử kính AI mang tính chất hỗ trợ hình dung; khách hàng vẫn nên kiểm tra kích thước thực tế và nhận tư vấn trực tiếp khi cần lựa chọn chính xác hơn.</p>

<h2>Chọn kính theo khuôn mặt và nhu cầu sử dụng</h2>
<p>MITOO không cho rằng có một mẫu kính phù hợp với tất cả mọi người. Mỗi khuôn mặt, phong cách và nhu cầu sử dụng đều có những đặc điểm riêng.</p>
<p>Khi tư vấn, MITOO chú trọng các yếu tố như:</p>
<ul>
  <li>Hình dáng và tỷ lệ khuôn mặt;</li>
  <li>Khoảng cách hai mắt;</li>
  <li>Độ rộng của gọng;</li>
  <li>Vị trí cầu mũi;</li>
  <li>Chiều dài càng kính;</li>
  <li>Trọng lượng sản phẩm;</li>
  <li>Thời gian đeo kính mỗi ngày;</li>
  <li>Môi trường học tập hoặc làm việc;</li>
  <li>Nhu cầu sử dụng kính cận, kính râm hay kính đổi màu;</li>
  <li>Phong cách cá nhân của người đeo.</li>
</ul>
<p>Mục tiêu là giúp khách hàng lựa chọn được chiếc kính hài hòa về thẩm mỹ, phù hợp về công năng và mang lại cảm giác thoải mái trong quá trình sử dụng.</p>

<h2>Giá trị MITOO hướng tới</h2>

<h3>Tư vấn dựa trên nhu cầu thực tế</h3>
<p>MITOO hướng đến việc cung cấp thông tin rõ ràng để khách hàng hiểu được sự khác nhau giữa các chất liệu gọng, loại tròng và lựa chọn phù hợp với nhu cầu của mình.</p>

<h3>Sản phẩm đa dạng, dễ lựa chọn</h3>
<p>Danh mục sản phẩm được xây dựng với nhiều kiểu dáng, mức giá và phong cách, giúp học sinh, sinh viên, nhân viên văn phòng và khách hàng yêu thích kính thời trang có thêm nhiều lựa chọn.</p>

<h3>Kết hợp cửa hàng truyền thống với công nghệ</h3>
<p>MITOO phát triển song song trải nghiệm tại cửa hàng và mua sắm trực tuyến. Khách hàng có thể xem sản phẩm, tìm hiểu thông tin và thử kính ảo trên website trước khi liên hệ tư vấn hoặc đến cửa hàng.</p>

<h3>Đồng hành trong quá trình sử dụng kính</h3>
<p>MITOO không chỉ hỗ trợ khách hàng tại thời điểm mua sản phẩm mà còn hướng dẫn cách sử dụng, vệ sinh và bảo quản kính. Các chính sách bảo hành, bảo trì, đổi trả và vận chuyển được áp dụng theo từng sản phẩm và thông tin công bố tại thời điểm mua hàng.</p>

<h2>Mua kính tại cửa hàng hoặc trực tuyến</h2>
<p>Khách hàng có thể tham khảo sản phẩm trực tiếp tại website mitoo.vn, sử dụng tính năng thử kính AI hoặc liên hệ với MITOO để được tư vấn.</p>
<p>MITOO hỗ trợ phục vụ khách hàng tại cửa hàng ở Bắc Ninh và giao sản phẩm đến nhiều tỉnh, thành trên toàn quốc. Thời gian giao hàng phụ thuộc vào địa chỉ nhận hàng, sản phẩm và đơn vị vận chuyển.</p>

<h2>Thông tin Kính Mắt MITOO</h2>
<ul>
  <li><strong>Tên thương hiệu:</strong> Kính Mắt MITOO</li>
  <li><strong>Đơn vị vận hành:</strong> Công ty TNHH MITOO Việt Nam</li>
  <li><strong>Mã số thuế:</strong> 2301405941</li>
  <li><strong>Địa chỉ:</strong> Số 151, thôn Phố Mới, xã Yên Phong, tỉnh Bắc Ninh</li>
  <li><strong>Hotline/Zalo:</strong> 0839 391 369</li>
  <li><strong>Email chăm sóc khách hàng:</strong> <a href="mailto:cskh.mitoo@gmail.com">cskh.mitoo@gmail.com</a></li>
  <li><strong>Website:</strong> mitoo.vn</li>
  <li><strong>Facebook:</strong> Kính Mắt MITOO</li>
</ul>

<h2>MITOO – Tìm chiếc kính phù hợp với chính bạn</h2>
<p>Một chiếc kính phù hợp không chỉ giúp bạn nhìn rõ hơn. Đó còn là sản phẩm đồng hành trong học tập, công việc và cuộc sống hằng ngày.</p>
<p>Kính Mắt MITOO mong muốn giúp mỗi khách hàng tìm được chiếc kính cân bằng giữa công năng, sự thoải mái và phong cách cá nhân.</p>
<p><strong>Kính Mắt MITOO – Bạn đẹp, tôi cũng vậy.</strong></p>
HTML;
    }

    /**
     * @throws JsonException
     */
    private function faqs(): string
    {
        return json_encode([
            [
                'question' => 'Kính Mắt MITOO là gì?',
                'answer' => 'Kính Mắt MITOO là cửa hàng kính mắt tại Yên Phong, Bắc Ninh, cung cấp gọng kính thời trang, kính cận, kính râm, kính đổi màu, tròng kính và các dịch vụ tư vấn, đo mắt, cắt kính.',
            ],
            [
                'question' => 'Cửa hàng Kính Mắt MITOO ở đâu?',
                'answer' => 'Cửa hàng MITOO nằm tại số 151, thôn Phố Mới, xã Yên Phong, tỉnh Bắc Ninh.',
            ],
            [
                'question' => 'MITOO có đo mắt và cắt kính không?',
                'answer' => 'Có. MITOO hỗ trợ kiểm tra thị lực, tư vấn chọn gọng, lựa chọn tròng kính và cắt kính theo thông số của khách hàng tại cửa hàng.',
            ],
            [
                'question' => 'MITOO có bán tròng kính chính hãng không?',
                'answer' => 'MITOO hỗ trợ lắp các loại tròng kính phục vụ nhiều nhu cầu sử dụng khác nhau. Một số thương hiệu được giới thiệu trên website gồm HOGA, CHEMI và Sensei.',
            ],
            [
                'question' => 'MITOO có tính năng thử kính online không?',
                'answer' => 'Có. Khách hàng có thể sử dụng tính năng thử kính ảo bằng AI tại mitoo.vn bằng cách tải ảnh khuôn mặt hoặc chụp ảnh trực tiếp từ camera.',
            ],
            [
                'question' => 'MITOO có giao hàng toàn quốc không?',
                'answer' => 'MITOO hỗ trợ giao hàng đến nhiều tỉnh, thành trên toàn quốc. Thời gian và chi phí vận chuyển được xác định theo địa chỉ nhận hàng và chính sách áp dụng tại thời điểm đặt mua.',
            ],
            [
                'question' => 'Làm thế nào để liên hệ Kính Mắt MITOO?',
                'answer' => 'Khách hàng có thể liên hệ MITOO qua hotline hoặc Zalo 0839 391 369, email cskh.mitoo@gmail.com hoặc gửi yêu cầu tư vấn trên website mitoo.vn.',
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
