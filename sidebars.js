/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    'index',
   // External link
    {
      type: 'link',
      label: 'Free Download', // The link label
      href: 'https://fluxbuilder.com/download', // The external URL
    },

    // External link
    {
      type: 'link',
      label: 'Support Ticket', // The link label
      href: 'https://support.fluxbuilder.com', // The external URL
    },
  ],

  // But you can create a sidebar manually
  
  // tutorialSidebar: [
  //   {
  //     type: 'category',
  //     label: 'Tutorial',
  //     items: ['hello'],
  //   },
  // ],
   
};

module.exports = sidebars;
