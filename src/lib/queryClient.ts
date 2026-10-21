import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dữ liệu được xem là còn mới trong 90 giây.
      staleTime: 90 * 1000,

      // Giữ cache trong bộ nhớ 5 phút sau khi không còn component sử dụng.
      gcTime: 5 * 60 * 1000,

      // Không tự động tải lại khi người dùng chuyển về tab trình duyệt.
      refetchOnWindowFocus: false,

      // Thử lại 1 lần nếu request thất bại.
      retry: 1,
    },
  },
});
