export const buildUserQuery = ({ search, role }: { search?: string; role?: string }) => {
  let where = '';
  const params: any[] = [];

  if (search) {
    where += `
      (
        u.name LIKE ?
        OR u.email LIKE ?
        OR r.name LIKE ?
        OR u.company_name LIKE ?
      )
    `;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (role) {
    if (where) where += ' AND ';
    where += ` r.name = ? `;
    params.push(role);
  }

  if (where) where = `WHERE ${where}`;

  return { where, params };
};
