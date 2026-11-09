import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { DocsPage } from "./pages/DocsPage";
import { BlogListPage } from "./pages/BlogListPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { SignUpModal } from "./components/SignUpModal";

export function App() {
  const [isNavSignUpOpen, setIsNavSignUpOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Navbar onOpenSignUp={() => setIsNavSignUpOpen(true)} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </main>
        <Footer />

        <SignUpModal
          isOpen={isNavSignUpOpen}
          onClose={() => setIsNavSignUpOpen(false)}
          defaultPlan="Developer"
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
