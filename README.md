# GitHub Pages React App

This is a modern React application built with Vite and TypeScript, ready to be deployed to GitHub Pages.

## Development

To start the development server:

```bash
yarn dev
```

## Building

To build the application:

```bash
yarn build
```

## Deployment

To deploy to GitHub Pages:

1. First, update the `homepage` field in `package.json` to match your GitHub Pages URL:
   ```json
   "homepage": "https://[your-username].github.io/[repository-name]"
   ```

2. Then run:
   ```bash
   yarn deploy
   ```

This will build the application and deploy it to the `gh-pages` branch of your repository.

## Technologies Used

- React
- TypeScript
- Vite
- GitHub Pages
