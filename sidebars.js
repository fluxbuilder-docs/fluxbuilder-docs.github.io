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
    'Onboarding',
    {
      type: 'category',
      label: 'FluxBuilder',
      collapsed: false,
      items: [
        {
          type: 'autogenerated', 
          dirName: 'FluxBuilder',
        },
      ]
    },
    {
      type: 'category',
      label: 'Agency',
      items: [
        {
          type: 'autogenerated', 
          dirName: 'Agency',
        },
      ]
    },
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
   

    // {type: 'doc',id: 'download-and-install'},
    // {
    //   type: 'category',
    //   label: 'Integration',
    //   items: [
    //     {
    //       type: 'autogenerated', 
    //       dirName: 'Integration',
    //     },
    //   ]
    // },
    // {
    //   type: 'category',
    //   label: 'Design',
    //   items: [
    //     {
    //       type: 'autogenerated', 
    //       dirName: 'Design',
    //     },
    //   ]
    // },
    // {
    //   type: 'category',
    //   label: 'Configuration',
    //   items: [
    //     {
    //       type: 'autogenerated', 
    //       dirName: 'Configuration',
    //     },
    //   ]
    // },
    // {
    //   type: 'category',
    //   label: 'Build',
    //   items: [
    //     {
    //       type: 'autogenerated', 
    //       dirName: 'Build',
    //     },
    //   ]
    // },
    // {
    //   type: 'category',
    //   label: 'Changelog',
    //   items: [
    //     {
    //       type: 'autogenerated', 
    //       dirName: 'Changelog',
    //     },
    //   ]
    // },
    // {type: 'doc',id: 'create-your-app'},
    // {type: 'doc',id: 'design-your-app'},
    // {type: 'doc',id: 'build-your-app-demo'},
    // {type: 'doc',id: 'config-app-features'},
    // {type: 'doc',id: 'build-and-publish-your-app'},
    // {type: 'doc',id: 'import-export-and-other'},
    // {type: 'doc',id: 'changelog'},
   

//     {
//       type: 'category',
//       label: 'Features',
//       items: [
//         {
//           type: 'autogenerated', 
//           dirName: 'Features',
//         },
//       ]
//     },
//     {
//       type: 'category',
//       label: 'Build Apps',
//       items: [
//         {
//           type: 'autogenerated', 
//           dirName: 'Build Apps',
//         },
//       ]
//     },
//     {
//       type: 'category',
//       label: 'Other',
//       items: [
//         {
//           type: 'autogenerated', 
//           dirName: 'Other',
//         },
//       ]
//     },
//     {
//       type: 'category',
//       label: 'Changelog',
//       items: [
//         {
//           type: 'autogenerated', 
//           dirName: 'Changelog',
//         },
//       ]
//     },
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
