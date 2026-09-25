/**
 * Tailwind CSS v4 no Next.js: um único plugin.
 *
 * Sem autoprefixer — o Lightning CSS do Turbopack já prefixa de acordo com os
 * targets do browserslist, e encadear os dois faria o mesmo trabalho duas vezes.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
