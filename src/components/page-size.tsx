"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
export function PageSize({ value }: Readonly<{ value: number }>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="page-size">
      Rows per page
      <select
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          next.set("pageSize", event.target.value);
          next.delete("page");
          router.replace(pathname + "?" + next.toString(), { scroll: false });
        }}
      >
        {[10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
