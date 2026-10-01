// Migrações do Drizzle: o babel-plugin-inline-import transforma o import do .sql em texto.
declare module '*.sql' {
  const sql: string;
  export default sql;
}
