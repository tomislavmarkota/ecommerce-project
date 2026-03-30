export const buildUserQuery = ({ search, role }: { search?: string; role?: string }) => {
  let where = '';
  const params: Array<string> = [];

  if (search) {
    where += `
      (
        u.name LIKE ?
        OR u.email LIKE ?
        OR r.name LIKE ?
        OR c.name LIKE ?
      )
    `;
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  if (role) {
    if (where) where += ' AND ';
    where += ` r.name = ? `;
    params.push(role);
  }

  if (where) {
    where = `WHERE ${where}`;
  }

  return { where, params };
};
