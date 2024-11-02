# amor

Get matching profile pictures for you and your significant others or friends with **amor**. Our user-friendly generator offers designs that celebrate your unique connections and bring your profiles to life!

## 📋 Features
- **Upload Images**: Upload your own photos or select from a set of user uploaded content.
- **Preview & Download**: Instantly preview your profile pictures and download them for easy sharing.

## 🛠️ Technologies
- **Frontend**: Next.JS + Tailwind CSS
- **Backend**: Next.JS API Routes
- **Database**: PostgreSQL, UploadThing
- **ORM**: Prisma

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/)
- [PostgreSQL](https://www.postgresql.org/)
- [UploadThing](https://uploadthing.com/)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/ivanoliverfabra/amor.git
    cd amor
    ```

2. **Install dependencies**:
    ```bash
    bun install
    ```

3. **Set up environment variables**:
    - Create a `.env` file in the root directory and add the following:
      ```plaintext
      DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
      UPLOADTHING_TOKEN="your_uploadthing_token"
      AUTH_SECRET="your_auth_secret"
      AUTH_DISCORD_ID="your_discord_id"
      AUTH_DISCORD_SECRET="your_discord_secret"
      ```

4. **Set up the database**:
    ```bash
    bunx prisma db execute --file ./db.sql
    ```

5. **Run the development server**:
    ```bash
    bun dev
    ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.