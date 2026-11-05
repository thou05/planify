Luồng trên giao diện:

1. Owner chọn **“Gỡ khỏi workspace”**.  
2. Hệ thống kiểm tra người đó đang quản trị những board nào.  
3. Nếu có board mà họ là Admin duy nhất, hiển thị:  
   Người này là quản trị viên cuối cùng của 3 board. Hãy chọn người tiếp quản trước khi gỡ.  
4. Với từng board, Owner chọn:  
   * **Bổ nhiệm thành viên khác:** chọn nhân sự chính thức còn hoạt động trong workspace; người đó được cấp Board Admin.  
   * **Owner tiếp quản:** Owner được thêm làm Board Admin.  
5. Xác nhận để hệ thống hoàn tất bàn giao và thu hồi quyền.

| Trường hợp | Cách xử lý |
| ----- | ----- |
| Board còn Admin khác | Gỡ người đó bình thường |
| Người đó là Admin cuối cùng | Bắt buộc chọn người tiếp quản |
| Board PRIVATE | Vẫn phải bàn giao; Owner chỉ thấy thông tin quản trị tối thiểu trước khi tiếp quản |
| Board đã lưu trữ | Vẫn bàn giao để có người khôi phục/quản lý sau này |

**Việc bàn giao và gỡ phải là một thao tác nhất quán:** hoặc hoàn tất cả hai, hoặc không thay đổi gì. Sau khi thành công:

* Người bị gỡ mất toàn bộ quyền thành viên tại các board thuộc workspace.  
* Các task đang giao cho họ được bàn giao hoặc bỏ phân công theo lựa chọn riêng.  
* Comment, lịch sử và thông tin tác giả cũ được giữ nguyên.  
* Ghi nhật ký người gỡ, người tiếp quản và các board bị ảnh hưởng; thông báo cho người tiếp quản.

**Không nên tự động nâng một Editor bất kỳ lên Admin.** Với board PRIVATE, việc bàn giao quyền cũng là cấp quyền xem dữ liệu, nên phải là lựa chọn rõ ràng của Owner.

Nếu cần khóa truy cập khẩn cấp, Owner có thể **khóa quyền truy cập workspace ngay**, rồi hoàn tất bàn giao sau; board liên quan tạm chặn thao tác quản trị cho đến khi có người tiếp quản.

**Đúng, theo mô hình đã đề xuất: “Gỡ khỏi workspace” nghĩa là thu hồi toàn bộ quyền thành viên của người đó tại mọi board thuộc workspace**, kể cả board PRIVATE và board do họ tạo. Các workspace khác không bị ảnh hưởng.

Cần phân biệt hai nhu cầu:

| Nhu cầu | Thao tác phù hợp |
| ----- | ----- |
| Nhân viên nghỉ việc, chấm dứt hợp tác | **Gỡ khỏi workspace** → mất toàn bộ quyền board trong workspace |
| Không còn là nhân sự nội bộ nhưng vẫn cộng tác ở một số dự án | **Chuyển thành Guest** → chỉ giữ những board được chọn |
| Chỉ ngừng tham gia một dự án | **Gỡ khỏi board đó** → giữ tư cách workspace và các board khác |

Khi chuyển thành Guest, nên hiện danh sách board để Admin **chọn rõ board được giữ**, tránh vô tình giữ quyền cũ.

Khi gỡ hoàn toàn:

* Nếu là Admin cuối cùng của board → phải bàn giao trước.  
* Thu hồi phân công task; giữ nguyên comment và lịch sử tác giả.  
* Nếu được mời lại sau này → cấp quyền mới, không tự khôi phục quyền cũ.

**Lưu ý với board PUBLIC:** họ vẫn có thể xem phần công khai như bất kỳ người ngoài nào, nhưng không còn quyền thành viên để sửa hoặc bình luận.

Trên hộp xác nhận nên ghi rõ: **“Người này sẽ mất quyền truy cập tất cả board riêng tư và nội bộ thuộc workspace này.”**

