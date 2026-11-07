"use client";

export function StaffRoleSelect({
  action,
  currentRole,
  memberName,
  roles,
}: {
  action: (formData: FormData) => void;
  currentRole: string;
  memberName: string;
  roles: [string, string][];
}) {
  return (
    <form action={action}>
      <select
        name="role"
        defaultValue={currentRole}
        aria-label={`Role for ${memberName}`}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#397f99] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
      >
        {roles.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
