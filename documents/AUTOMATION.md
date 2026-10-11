# Phân tích chức năng Automation trong Trello

Đối với hệ thống Planify bạn đang phát triển, nên nghiên cứu Automation của Trello theo hai góc độ: người dùng có thể thiết lập những loại tự động hóa nào và hệ thống cần có những thành phần gì để tự động hóa vận hành an toàn, chính xác.

Theo tài liệu chính thức của Trello, Automation cho phép thực thi các hành động tự động khi có sự kiện xảy ra, theo lịch hoặc dựa trên hạn công việc. Trello hiện tổ chức các chức năng chính thành 5 loại: Rules, Scheduled, Due Date, Card Buttons và Board Buttons.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



## 1. Tổng quan các mục cần có

1\. Rules — Quy tắc tự động

Khi một sự kiện xảy ra, hệ thống tự thực hiện các hành động đã cấu hình.

2\. Scheduled — Tự động theo lịch

Chạy vào các thời điểm hoặc chu kỳ đã đặt trước.

3\. Due Date — Tự động theo hạn công việc

Thực hiện hành động trước, vào hoặc sau hạn hoàn thành của Card.

4\. Card Button — Nút thao tác trên Card

Người dùng chủ động bấm nút để thực hiện một chuỗi hành động.

5\. Board Button — Nút thao tác trên Board

Thực hiện hành động trên Board, chẳng hạn xử lý hàng loạt Card theo tiêu chí.

Đây là 5 loại tự động hóa cốt lõi của Trello; bên cạnh đó, còn có các chức năng quản lý, báo cáo, gợi ý, theo dõi lịch sử và tích hợp.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support

+1



## 2. Phân tích chi tiết từng loại Automation

### 2.1. Rules — Tự động dựa trên sự kiện

Đây là thành phần quan trọng nhất vì xử lý những công việc lặp đi lặp lại khi trạng thái của hệ thống thay đổi.

Cấu trúc logic:

```
Trigger
   ↓
Kiểm tra điều kiện
   ↓
Thực hiện Actions
```

Ví dụ: Khi một Card được chuyển sang danh sách `Done`, hệ thống tự đánh dấu hoàn thành và thêm nhãn `Completed`.

| Thành phần | Vai trò                     | Ví dụ                                 |
| ---------- | --------------------------- | ------------------------------------- |
| Trigger    | Sự kiện làm quy tắc bắt đầu | Card được chuyển sang List            |
| Condition  | Điều kiện phải thỏa mãn     | Card có Custom Field `Reviewed = Yes` |
| Action     | Hành động cần thực hiện     | Thêm nhãn, giao người phụ trách       |
| Scope      | Phạm vi áp dụng             | Một Board cụ thể                      |
| Status     | Trạng thái của quy tắc      | Đang bật hoặc tắt                     |

Trello hỗ trợ bổ sung điều kiện nâng cao cho trigger; khi có nhiều điều kiện, tất cả phải đúng thì quy tắc mới kích hoạt.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Các tình huống nên hỗ trợ trong Planify:

- Khi tạo Card, tự gán người phụ trách mặc định.
- Khi di chuyển Card sang `In Progress`, ghi nhận thời điểm bắt đầu.
- Khi Card được chuyển sang `Done`, đánh dấu hoàn thành.
- Khi thêm thành viên vào Card, gửi thông báo cho người đó.
- Khi một Custom Field đổi giá trị, cập nhật trạng thái hoặc thực hiện hành động liên quan.
- Khi hoàn thành Checklist, có thể tự cập nhật trạng thái Card nếu thỏa điều kiện.

Phân tích thiết kế: Rules phải được kích hoạt dựa trên các sự kiện nghiệp vụ thực tế của Backend, không phải chỉ dựa vào việc người dùng bấm hoặc thao tác trên giao diện. Như vậy, dù Card được thay đổi qua API hay một hành động hệ thống, cơ chế tự động hóa vẫn có thể vận hành nhất quán.

### 2.2. Scheduled — Tự động theo lịch

Scheduled dành cho những hành động không cần chờ một Card thay đổi mà chạy theo lịch định trước. Trello có các quy tắc theo chu kỳ và cho phép chạy thử quy tắc lịch bằng chức năng `Run now`.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Ví dụ:

- Mỗi sáng thứ Hai, đưa các công việc của tuần mới lên đầu danh sách.
- Mỗi thứ Sáu, lưu trữ các Card đã hoàn thành từ lâu.
- Định kỳ sắp xếp Card theo hạn hoàn thành.
- Mỗi ngày, tổng hợp các công việc quá hạn.

Các trường cấu hình cần có:

| Trường          | Ý nghĩa                                              |
| --------------- | ---------------------------------------------------- |
| Tần suất        | Hàng ngày, hàng tuần, hàng tháng hoặc lịch tùy chỉnh |
| Ngày chạy       | Ví dụ thứ Hai hoặc ngày đầu tháng                    |
| Giờ chạy        | Ví dụ 08:00                                          |
| Múi giờ         | Quyết định thời điểm thực thi thực tế                |
| Phạm vi dữ liệu | Một List, một Board hoặc nhóm Card thỏa tiêu chí     |
| Hành động       | Những việc cần thực hiện khi đến lịch                |

Phân tích thiết kế: Backend cần có scheduler hoặc job queue để chạy công việc kể cả khi không có người dùng mở ứng dụng. Không nên phụ thuộc vào bộ đếm thời gian ở trình duyệt; cách đó không bảo đảm thực thi khi người dùng đã đóng website.

### 2.3. Due Date — Tự động theo hạn hoàn thành

Khác với Scheduled, loại này gắn thời gian thực thi với hạn của từng Card. Ví dụ, một ngày trước hạn thì thêm nhãn `Sắp đến hạn` và đưa Card lên đầu List. Đây là một kiểu tự động hóa riêng trong Trello.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Các tình huống thường gặp:

| Thời điểm                        | Hành động                               |
| -------------------------------- | --------------------------------------- |
| Trước hạn 3 ngày                 | Thông báo cho người phụ trách           |
| Trước hạn 1 ngày                 | Thêm nhãn `Due Soon`                    |
| Đến hạn                          | Gửi thông báo nhắc việc                 |
| Sau hạn                          | Thêm nhãn `Overdue`                     |
| Khi hạn được đánh dấu hoàn thành | Dừng những nhắc nhở không còn cần thiết |

Những quy tắc quan trọng khi thiết kế:

- Card không có Due Date thì không tạo lịch nhắc.
- Khi Due Date thay đổi, lịch nhắc cũ phải được cập nhật.
- Khi Card hoàn thành hoặc bị lưu trữ, những job không còn phù hợp phải được hủy hoặc bỏ qua.
- Cần xác định rõ múi giờ và xử lý trường hợp thời gian bị thay đổi.
- Tránh gửi thông báo trùng khi một job được thử lại.

Đối với Planify, nên kết hợp Due Date Automation với module Notification để có thể gửi thông báo trên ứng dụng và thông báo qua email nếu hệ thống bật kênh đó.

### 2.4. Card Button — Nút tự động hóa trên Card

Card Button là hành động do người dùng chủ động kích hoạt, không phải tự động chạy theo sự kiện. Trong Trello, người dùng có thể tạo nút trên mặt chi tiết Card và gắn nhiều hành động vào một nút.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Ví dụ, nút `Bàn giao công việc` có thể thực hiện lần lượt:

1. Chuyển Card sang List `Review`.
2. Gán người kiểm thử.
3. Thêm nhãn `Needs Review`.
4. Đăng bình luận thông báo bàn giao.

Các trường cần cấu hình:

- Tên nút.
- Biểu tượng nút.
- Phạm vi hiển thị.
- Quyền của người được phép sử dụng.
- Danh sách Actions.
- Thứ tự thực hiện Actions.
- Trạng thái bật/tắt nút.

Phân tích thiết kế: Card Button giúp biến nhiều thao tác thường xuyên thành một hành động thống nhất. Tuy nhiên, Backend vẫn phải kiểm tra quyền khi thực thi; việc nút xuất hiện trên giao diện không có nghĩa người dùng được phép thực hiện tất cả hành động phía sau.

### 2.5. Board Button — Nút tự động hóa trên Board

Board Button có cùng nguyên tắc với Card Button, nhưng phạm vi thao tác lớn hơn. Trello mô tả ví dụ nút Board dùng để sắp xếp hoặc di chuyển hàng loạt Card thỏa mãn tiêu chí nhất định.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Ví dụ:

- `Dọn dẹp Board`: lưu trữ các Card đã hoàn thành.
- `Chuẩn bị tuần mới`: di chuyển Card từ List `Next Week` sang `To Do`.
- `Sắp xếp theo hạn`: sắp xếp công việc theo Due Date.
- `Đóng Sprint`: xử lý một nhóm Card đáp ứng điều kiện.

Phân tích thiết kế: Vì có thể tác động đến nhiều Card, loại này cần cơ chế xác định trước tập dữ liệu mục tiêu, kiểm tra quyền, giới hạn số lượng bản ghi và cung cấp kết quả thực thi. Với các hành động có tác động lớn, nên hiển thị xác nhận trước khi chạy.

## 3. Những thành phần dùng chung trong Automation Builder

5 loại trên là cách phân loại tự động hóa. Để người dùng tạo được những quy tắc thực tế, hệ thống còn cần một Automation Builder với các thành phần cấu hình dùng chung.

### 3.1. Trigger — Sự kiện kích hoạt

Trigger trả lời câu hỏi: Điều gì đã xảy ra để quy tắc bắt đầu chạy?

Nên phân nhóm trigger theo đối tượng nghiệp vụ để người dùng dễ tìm.

| Nhóm            | Trigger điển hình                             |
| --------------- | --------------------------------------------- |
| Card            | Tạo, cập nhật, di chuyển, hoàn thành, lưu trữ |
| Thành viên      | Gán người phụ trách, thêm hoặc gỡ thành viên  |
| Label           | Thêm hoặc gỡ nhãn                             |
| Checklist       | Hoàn thành Checklist hoặc một mục Checklist   |
| Comment         | Có bình luận mới                              |
| Due Date        | Thêm, thay đổi hoặc đến hạn                   |
| Custom Field    | Giá trị trường thay đổi                       |
| List            | Tạo List hoặc đưa Card vào List               |
| Workspace/Board | Các sự kiện quản lý phạm vi phù hợp           |

Đây là danh mục đề xuất cho Planify, không phải khẳng định rằng Trello hỗ trợ mọi trigger trong bảng.

Điểm cần phân tích: Mỗi trigger nên được định nghĩa rõ ba yếu tố: sự kiện gì xảy ra, đối tượng nào bị ảnh hưởng và thông tin nào được cung cấp cho Actions. Ví dụ, sự kiện `CardMoved` nên có `cardId`, `sourceListId`, `destinationListId`, `actorId` và thời điểm xảy ra.

### 3.2. Conditions — Điều kiện lọc

Condition xác định quy tắc có thực sự áp dụng hay không. Nếu không có điều kiện, quy tắc có thể chạy trên quá nhiều Card và gây ra những thay đổi ngoài ý muốn.

Ví dụ:

```
TRIGGER:
Card được chuyển sang "Done"

CONDITIONS:
Priority = High
VÀ
Reviewed = Yes

ACTIONS:
Đánh dấu hoàn thành
Và gửi thông báo cho người quản lý
```

Planify nên hỗ trợ:

- So sánh trạng thái bằng, khác, chứa hoặc không chứa.
- Kiểm tra có hoặc chưa có người phụ trách.
- Kiểm tra nhãn, List, trạng thái hoàn thành.
- So sánh Custom Field theo loại dữ liệu.
- Kết hợp nhiều điều kiện bằng `AND`; bổ sung `OR` khi bộ máy thực thi đã hỗ trợ rõ ràng.
- Kiểm tra các giá trị rỗng hoặc chưa được thiết lập.

Trello xác nhận hỗ trợ nhiều điều kiện cho trigger nâng cao, và các điều kiện được thiết lập theo cơ chế tất cả đều phải đúng. Việc mở rộng thành một hệ thống điều kiện tổng quát với `AND/OR` lồng nhau nên được xem là lựa chọn kiến trúc cho Planify.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



### 3.3. Actions — Hành động được thực thi

Action là phần quyết định hệ thống làm gì khi Trigger và Conditions thỏa mãn.

Thay đổi Card

Tạo, cập nhật tiêu đề, di chuyển, đánh dấu hoàn thành hoặc lưu trữ Card.

Quản lý phân công

Gán hoặc gỡ thành viên, thay đổi thông tin phân công theo quy tắc.

Nhãn và Custom Field

Thêm/gỡ Label, cập nhật giá trị trường tùy chỉnh.

Bình luận và thông báo

Đăng bình luận, tạo Notification hoặc gửi thông báo qua kênh đã tích hợp.

Checklist và dữ liệu liên quan

Tạo hoặc cập nhật Checklist và xử lý các Card khác khi có đủ điều kiện.

Trello còn có các khả năng nâng cao như tra cứu Card khác để thao tác hoặc tham chiếu, sử dụng Custom Field và gửi HTTP request.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support

+1



Phân tích thiết kế: Mỗi Action cần có schema cấu hình riêng. Ví dụ, Action `Move Card` cần `targetListId`, còn Action `Add Label` cần `labelId`. Không nên lưu một Action chung với các tham số tự do không được kiểm tra, bởi dữ liệu sai có thể khiến toàn bộ quy tắc lỗi.

### 3.4. Multi-action — Một quy tắc, nhiều hành động

Một Automation thực tế thường thực hiện nhiều Actions liên tiếp.

Ví dụ:

```
Khi Card được chuyển sang "Review"
        ↓
    Gán Reviewer
        ↓
    Thêm nhãn "Needs Review"
        ↓
    Tạo Notification
        ↓
    Ghi Activity Log
```

Trello cho phép nhiều hành động trong cùng một Automation và hiện giới hạn mỗi Automation tối đa 20 Actions. Giới hạn cụ thể của Planify nên cấu hình được từ Backend thay vì cố định trong giao diện.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support

+1



Khi thiết kế, cần xác định thứ tự thực hiện, chính sách khi một Action thất bại và cách xử lý thử lại. Đặc biệt, một thông báo được gửi hai lần hoặc một hành động di chuyển Card chạy lặp có thể tạo ra trải nghiệm không mong muốn.

### 3.5. Variables — Biến động

Variables cho phép dùng thông tin thực tế tại thời điểm chạy thay vì phải nhập nội dung cố định.

Ví dụ bình luận:

```
Card đã được hoàn thành vào {date}
```

Hoặc:

```
Công việc được chuyển sang Review bởi {username}
```

Trello hỗ trợ biến trong nội dung như tên Card, ngày, người thực hiện và một số giá trị Custom Field tùy loại trigger.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Planify nên có một danh mục biến được chọn từ giao diện, chẳng hạn:

`{{card.title}}`, `{{actor.name}}`, `{{card.dueDate}}`, `{{customField.value}}`.

Tên biến trên chỉ là định dạng đề xuất cho Planify, không phải cú pháp của Trello.

Yêu cầu quan trọng: Trước khi lưu quy tắc, hệ thống cần xác minh biến có hợp lệ và có dữ liệu trong ngữ cảnh chạy hay không. Nếu giá trị không tồn tại, phải xác định sẽ thay bằng chuỗi rỗng, dùng giá trị mặc định hay bỏ qua Action.

### 3.6. Scope — Phạm vi tác động

Cần phân biệt:

- Phạm vi kích hoạt: Board nào và đối tượng nào có thể kích hoạt quy tắc.
- Đối tượng bị tác động: Card hiện tại, Card được tìm thấy hay nhiều Card.
- Phạm vi quyền: Người nào được tạo, chỉnh sửa, bật/tắt hoặc chạy quy tắc.

Đây là yêu cầu đặc biệt quan trọng với Board Button và các Action xử lý hàng loạt. Mọi thao tác phải được kiểm tra quyền ở Backend, không chỉ phụ thuộc vào việc người dùng nhìn thấy nút trên giao diện.

## 4. Quản lý Automation sau khi tạo

Một hệ thống Automation hoàn chỉnh không thể chỉ có màn hình tạo quy tắc. Người dùng cần quản lý, kiểm tra và xử lý quy tắc trong suốt vòng đời sử dụng.

| Mục                  | Chức năng cần có                         | Phân tích                                            |
| -------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Danh sách Automation | Xem các quy tắc, loại, trạng thái        | Giúp tìm quy tắc đang áp dụng trên Board             |
| Tạo mới              | Tạo Rule, Schedule, Due Date hoặc Button | Là điểm vào của Automation Builder                   |
| Chỉnh sửa            | Sửa trigger, điều kiện, Actions          | Tránh phải xóa rồi tạo lại                           |
| Bật/tắt              | Kích hoạt hoặc tạm ngừng                 | Giữ nguyên cấu hình khi chưa muốn chạy               |
| Sao chép             | Nhân bản quy tắc                         | Giảm công thiết lập các quy tắc tương tự             |
| Xóa                  | Gỡ bỏ quy tắc                            | Cần xác nhận nếu quy tắc đang hoạt động              |
| Tìm kiếm/lọc         | Lọc theo loại, trạng thái, tên           | Hữu ích khi Board có nhiều Automation                |
| Gắn nhãn/phân nhóm   | Nhóm các quy tắc theo mục đích           | Giúp phân biệt quy tắc phân công, nhắc việc, dọn dẹp |
| Thư viện mẫu         | Tạo từ mẫu có sẵn                        | Giúp người dùng không cần bắt đầu từ đầu             |

Trello hỗ trợ chỉnh sửa, sao chép, xóa, theo dõi log và gắn nhãn Automation; nhãn còn có thể hỗ trợ tổ chức thư viện quy tắc dùng lại.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support

+2



### 4.1. Templates và Suggestions

Đây là lớp giúp người dùng phổ thông dễ tiếp cận Automation.

Thay vì phải tự cấu hình mọi thành phần, người dùng có thể chọn mẫu như:

- Tự gán người phụ trách khi tạo Card.
- Nhắc nhở trước hạn.
- Lưu trữ công việc đã hoàn thành.
- Tự thêm nhãn khi Card vào một List.
- Sắp xếp List theo lịch.

Trello có các gợi ý tự động hóa và những mẫu báo cáo email được thiết lập sẵn.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Đối với Planify, mỗi mẫu nên có mô tả ngắn, điều kiện cần thiết, các Actions sẽ chạy và phạm vi tác động. Người dùng nên xem trước và chỉnh sửa cấu hình trước khi kích hoạt.

### 4.2. Email Reports — Báo cáo gửi định kỳ

Trello cung cấp các báo cáo email có lịch gửi và cho phép tùy chỉnh người nhận, thời gian, tiêu đề và nội dung.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Planify có thể phát triển chức năng tương tự với:

- Báo cáo Card quá hạn.
- Báo cáo tiến độ Board.
- Báo cáo công việc theo thành viên.
- Báo cáo hoàn thành theo tuần.
- Báo cáo các công việc sắp đến hạn.

Đây nên được thiết kế là một nhóm chức năng báo cáo định kỳ, có thể sử dụng chung bộ máy Scheduler nhưng cần cấu hình mẫu nội dung, người nhận, quyền xem dữ liệu và chính sách gửi email riêng.

## 5. Automation Log — Lịch sử thực thi

Đây là một trong những mục quan trọng nhất đối với hệ thống quản lý công việc, vì quy tắc tự động có thể thay đổi dữ liệu mà người dùng không trực tiếp thao tác.

Trello có log để theo dõi thời điểm Automation kích hoạt, những lỗi xảy ra và lịch sử thay đổi cấu hình; ngoài ra còn có màn hình theo dõi mức sử dụng Automation của Workspace.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support

+1



### 5.1. Những thông tin cần ghi nhận

| Trường dữ liệu      | Ý nghĩa                         |
| ------------------- | ------------------------------- |
| `execution_id`      | Mã của lần thực thi             |
| `automation_id`     | Quy tắc đã chạy                 |
| `trigger_event`     | Sự kiện kích hoạt               |
| `started_at`        | Thời điểm bắt đầu               |
| `finished_at`       | Thời điểm kết thúc              |
| `status`            | Trạng thái thực thi             |
| `actions_total`     | Tổng số hành động               |
| `actions_succeeded` | Số hành động thành công         |
| `error_code`        | Mã lỗi nếu có                   |
| `error_message`     | Mô tả lỗi đã được xử lý an toàn |

Giao diện nên có các bộ lọc theo thời gian, quy tắc, trạng thái và đối tượng bị ảnh hưởng.

Ví dụ:

Tự gán Reviewer

10:15:02 · Card chuyển sang Review

Thành công

Gửi thông báo email

10:15:03 · Không gửi được tới dịch vụ email

Thất bại

Thông tin minh họa giao diện, không phải dữ liệu thực tế của Trello.

### 5.2. Phân tích xử lý lỗi

Không nên chỉ lưu trạng thái chung là `Failed`. Cần biết hành động nào thất bại và những hành động trước đó đã thực hiện đến đâu.

Ví dụ, nếu quy tắc đã gán Reviewer và thêm nhãn nhưng gửi email thất bại, hệ thống không nhất thiết phải hoàn tác việc gán người và thêm nhãn. Thay vào đó, có thể giữ kết quả đã thành công và thử lại riêng Action gửi email.

Để làm được điều này, nên có:

- Log cho từng Action.
- Mã lỗi ổn định để Frontend xử lý.
- Cơ chế retry với giới hạn.
- Chống thực thi trùng khi retry.
- Thông báo lỗi dễ hiểu cho người quản lý.
- Nút chạy lại an toàn đối với các lỗi có thể khắc phục.

Với Actions làm thay đổi dữ liệu quan trọng, hệ thống cần định nghĩa rõ hành vi khi một bước trong chuỗi thất bại; không nên mặc định rằng toàn bộ chuỗi có thể hoàn tác như một giao dịch database duy nhất.

## 6. Quota và giới hạn sử dụng

Automation có thể tạo ra hàng nghìn thao tác khi số lượng Board, Card và thành viên tăng lên. Vì vậy, cần có cơ chế kiểm soát tài nguyên.

Trello phân biệt giữa automation run — một lần Automation được kích hoạt — và operation — một hành động được thực hiện. Một lần chạy có thể tiêu tốn nhiều operation; quota được quản lý theo Workspace và phụ thuộc vào gói dịch vụ.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support



Planify nên theo dõi:

| Chỉ số                    | Mục đích                              |
| ------------------------- | ------------------------------------- |
| Số lần chạy               | Đo tần suất Automation được kích hoạt |
| Số Actions thực hiện      | Đo khối lượng công việc               |
| Thời gian thực thi        | Phát hiện quy tắc chạy chậm           |
| Số lần lỗi                | Xác định quy tắc có vấn đề            |
| Số job đang chờ           | Theo dõi tải của hệ thống             |
| Số lần retry              | Phát hiện lỗi lặp lại                 |
| Giới hạn theo gói dịch vụ | Kiểm soát chi phí và mức sử dụng      |

Khi vượt giới hạn, nên thông báo rõ nguyên nhân và chính sách xử lý. Không nên âm thầm bỏ qua quy tắc, cũng không nên để một Automation vòng lặp ảnh hưởng đến toàn hệ thống.

## 7. Tích hợp bên ngoài

Trello có hỗ trợ mở rộng Automation thông qua HTTP request và tích hợp với một số dịch vụ như Jira, Slack và Bitbucket.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://support.atlassian.com\&sz=32)

Atlassian Support

+1



Đối với Planify, có thể phát triển theo ba cấp:

Cấp 1 — Tích hợp nội bộ: Card, List, Member, Label, Notification, Activity Log.

Cấp 2 — Webhook và HTTP: Khi sự kiện xảy ra, gửi dữ liệu tới hệ thống bên ngoài hoặc tiếp nhận sự kiện từ dịch vụ được phép.

Cấp 3 — Tích hợp chuyên biệt: Email, Slack, GitHub, lịch làm việc hoặc các nền tảng quản lý dự án khác.

Đây là phần nên phát triển sau khi bộ máy Automation nội bộ đã ổn định. HTTP request tùy ý cần được giới hạn và kiểm tra đích đến để tránh lộ dữ liệu, truy cập tài nguyên nội bộ hoặc tạo ra các yêu cầu không an toàn.

## 8. Những yêu cầu kỹ thuật không nên bỏ qua

Các mục giao diện phía trên chưa đủ để tạo ra một Automation Engine đáng tin cậy. Đối với Planify, tôi đặc biệt khuyến nghị các yêu cầu sau.

### 8.1. Chống vòng lặp Automation

Ví dụ:

```
Rule A:
Khi Card được chuyển sang Done
→ Chuyển Card sang Archived

Rule B:
Khi Card được lưu trữ
→ Chuyển Card sang Done
```

Nếu sự kiện do Automation tạo ra tiếp tục kích hoạt những quy tắc khác, hệ thống có thể rơi vào chuỗi thực thi không mong muốn.

Cần có giới hạn độ sâu chuỗi kích hoạt, giới hạn số lần chạy, cơ chế phát hiện lặp và khả năng tạm dừng quy tắc có vấn đề.

### 8.2. Phân biệt sự kiện của người dùng với sự kiện do hệ thống tạo

Một Card có thể thay đổi bởi người dùng, API, Automation, hoặc tiến trình nền.

Nên lưu nguồn phát sinh sự kiện, chẳng hạn:

```
actor_type: USER | AUTOMATION | SYSTEM
actor_id: ...
correlation_id: ...
```

Điều này giúp lọc các sự kiện không nên kích hoạt lại chính quy tắc đã tạo ra chúng, đồng thời làm cho Activity Log dễ giải thích hơn.

### 8.3. Xử lý thực thi bất đồng bộ

Các tác vụ như gửi email, gọi LLM, truy vấn nhiều Card hoặc gọi API bên ngoài không nên khiến request thao tác Board phải chờ quá lâu.

Kiến trúc phù hợp là:

```
Board Event
    ↓
Event Handler
    ↓
Automation Matcher
    ↓
Job Queue
    ↓
Automation Worker
    ├── Validate Conditions
    ├── Execute Actions
    └── Write Execution Log
```

Một số công việc đơn giản có thể xử lý nhanh; các tác vụ nặng nên vào hàng đợi để có retry, giới hạn concurrency và theo dõi trạng thái.

### 8.4. Phân quyền ở từng bước

Quy tắc được tạo bởi một người nhưng có thể chạy khi người khác thao tác. Do đó, cần xác định rõ quyền được kiểm tra dựa trên người tạo quy tắc, người kích hoạt, hay một danh tính hệ thống được ủy quyền.

Với Planify, hãy mặc định kiểm tra quyền cho mọi thao tác dữ liệu, không cho Automation vượt qua quy tắc truy cập Board/Card. Những quy tắc nhạy cảm cũng cần giới hạn ai được sửa, bật hoặc chạy thủ công.

## 9. Danh sách chức năng nên triển khai cho Planify

Từ phân tích Trello và yêu cầu của dự án Planify, tôi đề xuất chia thành ba giai đoạn như sau.

### Giai đoạn 1 — MVP bắt buộc

Mục tiêu: tạo và chạy được quy tắc đơn giản một cách đáng tin cậy.

0/9 mục đã đánh dấu

Automation Builder

Rules: Trigger + Conditions + Actions

Actions cho Card, List, Label, Member và Notification

Scheduled Automation cơ bản

Due Date Reminder

Bật/tắt, chỉnh sửa, sao chép và xóa quy tắc

Automation Log và trạng thái lỗi

Kiểm tra quyền, chống lặp và giới hạn chạy

Unit test và integration test cho Automation Engine

### Giai đoạn 2 — Mở rộng nghiệp vụ

Mục tiêu: tăng tính linh hoạt và giảm thao tác thủ công.

0/8 mục đã đánh dấu

Card Button và Board Button

Variables trong nội dung Actions

Custom Field conditions và actions

Tìm kiếm/tra cứu Card liên quan

Thư viện Automation Templates

Báo cáo email định kỳ

Quản lý quota và thống kê mức sử dụng

Quản lý nâng cao dành cho Workspace Admin

### Giai đoạn 3 — Nâng cao

Mục tiêu: mở rộng thành nền tảng tự động hóa tích hợp.

0/7 mục đã đánh dấu

HTTP Request và Webhook có kiểm soát

Tích hợp dịch vụ bên ngoài

Logic AND/OR nhiều tầng

Xử lý sự kiện liên quan nhiều Card

Thư viện Automation có thể chia sẻ

AI hỗ trợ tạo quy tắc từ mô tả ngôn ngữ tự nhiên

Giám sát tải, hiệu năng và độ tin cậy


Về dữ liệu, tối thiểu nên có các nhóm bảng như `automations`, `automation_triggers` hoặc trigger config, `automation_executions`, `automation_action_executions` và cấu hình liên quan. Có thể lưu điều kiện, tham số Action dưới dạng JSONB, nhưng phải validate theo schema tương ứng; còn lịch chạy, trạng thái, lịch sử thực thi và quan hệ với Board cần được quản lý có cấu trúc rõ ràng.

Kết luận: Phần Automation không chỉ là một màn hình cho phép chọn điều kiện và hành động. Một triển khai tốt gồm ba lớp: Automation Builder để người dùng cấu hình, Automation Engine để đánh giá sự kiện và thực thi hành động, và Execution Management để kiểm soát quyền, log, retry, vòng lặp và giới hạn tài nguyên. Với Planify, nên ưu tiên làm chắc ba lớp này trước rồi mới mở rộng AI và các tích hợp bên ngoài.