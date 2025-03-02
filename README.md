# Installation Guide

## Project Setup
### Prerequisites
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js and npm
sudo apt-get install -y nodejs

# Verify installation
node -v && npm -v
```

### Bare Node.js Installation

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/tensor_expressions_webapp.git
    cd tensor_expressions_webapp
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Run the application:**
    ```sh
    npm run dev
    ```

4. **Open your browser and navigate to:**
    ```
    http://localhost:5173/tensor_expressions_webapp/
    ```

### Docker Installation

```bash
# Build Docker image
docker-compose build

# Start container
docker-compose up

# Access at http://localhost:4173/tensor_expressions_webapp/
```

### Build version hosting with apache
```bash
# Start build
npm run build

# Build folder is dist in vite
# Now, take all files from that newly created build folder and upload them into your_folder_name, with filezilla, for instance, in subfolder like this:

#public_html/your_folder_name
#Check in the browser!

```

### GitHub Pages Deployment

The project is deployed on GitHub Pages. You can find the live version at:
```
https://seriousseal.github.io/tensor_expressions_webapp/
```
