import { createServer } from 'vite';

async function main() {
  const server = await createServer({
    server: { middlewareMode: true }
  });
  try {
    const React = (await import('react')).default;
    const ReactDOMServer = (await import('react-dom/server')).default;
    const { AppProvider } = await server.ssrLoadModule('/src/context/AppContext.tsx');
    const { App } = await server.ssrLoadModule('/src/App.tsx');
    
    console.log('Modules loaded successfully! Rendering...');
    const html = ReactDOMServer.renderToString(
      React.createElement(AppProvider, null, React.createElement(App, null))
    );
    console.log('Render SUCCESS! Length:', html.length);
  } catch (err) {
    console.error('SSR Render Error:', err);
  } finally {
    await server.close();
  }
}

main();
