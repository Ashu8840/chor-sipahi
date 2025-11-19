import { getRoleColor } from "../utils/helpers";

export default function RoleBadge({ role, className = "" }) {
  return (
    <span className={`role-badge ${getRoleColor(role)} ${className}`}>
      {role}
    </span>
  );
}
