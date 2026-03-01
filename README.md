# Form Builder

A modern, full-stack Form Builder application with a drag-and-drop editor, autosave, real-time analytics, and a responsive respondent view.

## ⚓ Deployed
Deployed on [Vercel](https://ristek-form-builder-fe.vercel.app)

## 🚀 Features

- **Drag-and-Drop Editor**: Build complex forms with multiple question types (Short Answer, Multiple Choice, Checkbox, Dropdown).
- **Autosave**: Changes are automatically saved to the database as you edit.
- **Analytics Dashboard**: Visualize response data with Pie and Bar charts using Recharts.
- **Authentication**: Secure JWT-based authentication for managing your forms.
- **Published/Draft States**: Control when your forms are public.
- **Nested Question Management**: Support for infinite options within choice-based questions.

---

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js**: v18 or later.
- **PostgreSQL**: A running instance (e.g., [Neon](https://neon.tech/)).

### 1. Backend Setup

1.  **Navigate to the root directory**:
    ```bash
    cd ..
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Create a `.env` file in the root directory and add:
    ```env
    DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require&schema=public"
    JWT_SECRET="your_secret_key"
    PORT=8080
    ```

4.  **Initialize Database**:
    Push the Prisma schema to your database:
    ```bash
    npx prisma db push
    ```

5.  **Start the server**:
    ```bash
    npm run dev
    ```
    The backend will be running at `http://localhost:8080`.
    Swagger docs are available at `http://localhost:8080/api-docs`.

### 2. Frontend Setup

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Create a `.env.local` file in the `frontend` directory:
    ```env
    NEXT_PUBLIC_API_URL="http://localhost:8080"
    ```

4.  **Start the development server**:
    ```bash
    npm run dev
    ```
    The frontend will be running at `http://localhost:3000`.

---

## 🏗️ Technology Stack

- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL, JWT, Swagger.
- **Frontend**: Next.js (App Router), Tailwind CSS, React Hook Form, Zod, dnd-kit, Recharts, Lucide React.

---

## 📝 Usage

1.  **Register/Login**: Create an account to start building forms.
2.  **Dashboard**: View all your forms, search by title, and sort by creation date.
3.  **Editor**: Click "Edit" on a form. Add questions, drag them to reorder, and toggle "Publish" to make them public.
4.  **Respondent View**: Use the link `/f/[form-id]` to let people fill out your form.
5.  **Analytics**: Click "Results" on the dashboard to see visualized data of your submissions.
