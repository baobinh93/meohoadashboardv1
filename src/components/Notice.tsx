export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  return <p className={error ? "notice error" : "notice"} role="status">{message}</p>;
}
