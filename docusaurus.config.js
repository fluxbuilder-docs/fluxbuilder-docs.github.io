// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Document - FluxBuilder - An Ultimate Approach For Flutter Mobile Apps",
  tagline: "",
  url: "https://docs.fluxbuilder.com",
  baseUrl: "/",
  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",

  organizationName: "fluxbuilder-docs",
  projectName: "fluxbuilder-docs.github.io",
  deploymentBranch: "gh-pages",

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: {
          customCss: [
            require.resolve("./css/docu-notion-styles.css"),
            require.resolve("./css/gifplayer.css"),
          ],
        },
        gtag: {
          trackingID: 'G-QKWPZEM3TZ',
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: "/",
      },
    ],
  ],

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
    localeConfigs: {
      en: {
        label: "English",
        direction: "ltr",
        htmlLang: "en-US",
        calendar: "gregory",
      },
    },
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      metadata: [
        {
          name: "keywords",
          content: "Document - FluxBuilder - An Ultimate Approach For Flutter Mobile Apps",
        },
      ],
    
      sitemap: {
        changefreq: "weekly",
        priority: 0.5,
        ignorePatterns: [],
      },

      navbar: {
        title: "",
        hideOnScroll: true,
        logo: {
          alt: "Logo",
          src: "img/logo.png",
          srcDark: 'img/logo_dark.png',
          href: 'https://fluxbuilder.com',
          target: '_self',
        },
        items: [
          {
            href: 'https://fluxbuilder.com',
            position: 'right',
            className: 'header-link',
            label: 'Home',
          },
          {
            href: 'https://fluxbuilder.com/feature',
            position: 'right',
            className: 'header-link',
            label: 'Feature',
          },
          {
            href: 'https://fluxbuilder.com/agency',
            position: 'right',
            className: 'header-link',
            label: 'Agency',
          },
          {
            href: 'https://fluxbuilder.com/pricing',
            position: 'right',
            className: 'header-link',
            label: 'Pricing',
          },
          {
            href: 'https://docs.fluxbuilder.com',
            position: 'right',
            className: 'header-link active',
            label: 'Docs',
          },
          {
            href: 'https://fluxbuilder.com/pricing',
            position: 'right',
            className: 'header-link',
            label: 'Profile',
          },
          {
            type: 'search',
            position: 'left',
          },
        ],
      },
      
      footer: {
        style: 'light',
        logo: {
          alt: 'InspireUI',
          src: '/img/logo.png',
          href: 'https://www.fluxbuilder.com',
          width: 160,
          height: 36,
        },
        copyright: `Copyright © ${new Date().getFullYear()} <a href="https://inspireui.com">InspireUI Ltd.</a>`,
      },

      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },

      scripts: [
        {
          src: 'https://cdn.taku-app.com/js/latest.js',
          async: true,
          defer: true,
        },
        {
          src: '/src/taku-init.js',
          async: true,
          defer: true,
        },
      ],
    }),
};

module.exports = config;
