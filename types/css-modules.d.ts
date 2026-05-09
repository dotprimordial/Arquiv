// Type declarations for CSS imports
declare module '*.css' {
  const content: string;
  export default content;
}

// Specific CSS imports for third-party libraries
declare module 'react-quill-new/dist/quill.snow.css' {
  const content: string;
  export default content;
}

declare module 'react-quill-new/dist/quill.bubble.css' {
  const content: string;
  export default content;
}

declare module 'react-quill-new/dist/quill.core.css' {
  const content: string;
  export default content;
}
