// pages/index.js
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
 Shield, TrendingUp, PiggyBank, Calculator, Smartphone, Lock,
 ChartBar, Target, CreditCard, Users, Star, Check, ArrowRight,
 Twitter, Linkedin, Facebook, Mail, ChevronDown, Menu, X,
 DollarSign, Eye, Zap, Award, HeartHandshake, Sparkles
} from 'lucide-react';

export default function HomePage() {
 const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
 const [faqOpen, setFaqOpen] = React.useState({});

 const toggleFaq = (index) => {
   setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
 };

 const features = [
   {
     icon: <Shield className="h-6 w-6" />,
     title: "Bank-Grade Security",
     description: "Track your net worth without sharing bank passwords. Manual entry keeps you in control.",
     color: "text-emerald-500"
   },
   {
     icon: <PiggyBank className="h-6 w-6" />,
     title: "Low-Cost Solution",
     description: "Save hundreds yearly compared to Mint, YNAB, or Monarch. Premium features at DIY prices.",
     color: "text-blue-500"
   },
   {
     icon: <Calculator className="h-6 w-6" />,
     title: "Retirement Calculator",
     description: "Plan your financial independence with powerful retirement projections and Monte Carlo analysis.",
     color: "text-purple-500"
   },
   {
     icon: <ChartBar className="h-6 w-6" />,
     title: "Investment Tracking",
     description: "Monitor stocks, bonds, crypto, and real estate in one unified dashboard.",
     color: "text-orange-500"
   },
   {
     icon: <Target className="h-6 w-6" />,
     title: "Goal Setting",
     description: "Set and track financial goals with visual progress indicators and milestone alerts.",
     color: "text-pink-500"
   },
   {
     icon: <Smartphone className="h-6 w-6" />,
     title: "Mobile Friendly",
     description: "Access your financial data anywhere with our responsive, mobile-optimized interface.",
     color: "text-indigo-500"
   }
 ];

 const testimonials = [
   {
     name: "Sarah Chen",
     role: "Software Engineer",
     content: "Finally, a Mint alternative that respects my privacy! NestEgg gives me total control without the security risks.",
     rating: 5,
     image: "SC"
   },
   {
     name: "Michael Rodriguez",
     role: "Small Business Owner",
     content: "The retirement planning tools rival expensive advisors. I save $2,000/year compared to my old financial planner.",
     rating: 5,
     image: "MR"
   },
   {
     name: "Emily Thompson",
     role: "Teacher",
     content: "YNAB-style budgeting meets Tiller's flexibility. Perfect for DIY finance nerds who want complete control.",
     rating: 5,
     image: "ET"
   }
 ];

 const faqs = [
   {
     question: "Do I need to share my bank password?",
     answer: "Never! Unlike Mint or other services, NestEgg uses manual entry or CSV imports. Your bank credentials stay with you, ensuring maximum security and privacy."
   },
   {
     question: "How does NestEgg compare to YNAB or Monarch?",
     answer: "NestEgg combines YNAB's powerful budgeting with Monarch's investment tracking, plus retirement planning tools - all at a fraction of the cost. Think of it as your all-in-one financial command center."
   },
   {
     question: "Is there a free trial?",
     answer: "Yes! Enjoy a 30-day free trial with full access to all features. No credit card required to start."
   },
   {
     question: "Can I import data from Mint or Quicken?",
     answer: "Absolutely! We support CSV imports from all major financial apps including Mint, Quicken, YNAB, and Personal Capital."
   }
 ];

 const structuredData = {
   "@context": "https://schema.org",
   "@type": "SoftwareApplication",
   "name": "NestEgg",
   "description": "Low-cost DIY personal finance app for net worth tracking, retirement planning, and budgeting without bank login requirements",
   "url": "https://nestegg.app",
   "logo": "https://nestegg.app/logo.png",
   "applicationCategory": "FinanceApplication",
   "operatingSystem": "Web, iOS, Android",
   "offers": {
     "@type": "Offer",
     "price": "4.99",
     "priceCurrency": "USD",
     "priceValidUntil": "2025-12-31"
   },
   "aggregateRating": {
     "@type": "AggregateRating",
     "ratingValue": "4.8",
     "ratingCount": "2847"
   }
 };

 const faqStructuredData = {
   "@context": "https://schema.org",
   "@type": "FAQPage",
   "mainEntity": faqs.map(faq => ({
     "@type": "Question",
     "name": faq.question,
     "acceptedAnswer": {
       "@type": "Answer",
       "text": faq.answer
     }
   }))
 };

 return (
   <>
     <Head>
       <title>NestEgg - Net Worth Tracker & Retirement Planning | Low-Cost Personal Finance</title>
       <meta name="description" content="Track your net worth, plan retirement, and manage budgets with NestEgg - the DIY personal finance app that never asks for bank logins. Mint alternative with YNAB-style budgeting." />
       <meta name="keywords" content="net worth tracker, retirement planning, low-cost personal finance, DIY budgeting, no bank-login required, Mint alternative, YNAB style budgeting, Tiller flexibility, Monarch-like insights, single-stop finance" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       <link rel="canonical" href="https://nestegg.app" />
       
       {/* Open Graph */}
       <meta property="og:title" content="NestEgg - Your DIY Net Worth & Retirement Planner" />
       <meta property="og:description" content="Secure net worth tracking and retirement planning without sharing bank passwords. Low-cost alternative to Mint, YNAB, and Monarch." />
       <meta property="og:image" content="https://nestegg.app/og-image.png" />
       <meta property="og:url" content="https://nestegg.app" />
       <meta property="og:type" content="website" />
       
       {/* Twitter Card */}
       <meta name="twitter:card" content="summary_large_image" />
       <meta name="twitter:title" content="NestEgg - DIY Personal Finance & Net Worth Tracker" />
       <meta name="twitter:description" content="Track net worth & plan retirement without bank logins. Low-cost Mint alternative." />
       <meta name="twitter:image" content="https://nestegg.app/twitter-card.png" />
       
       {/* Structured Data */}
       <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
       <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />
       
       {/* Preconnect to external domains */}
       <link rel="preconnect" href="https://fonts.googleapis.com" />
       <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
       
       {/* Critical CSS inline */}
       <style dangerouslySetInnerHTML={{ __html: `
         .hero-gradient {
           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
         }
         .feature-card {
           backdrop-filter: blur(10px);
           background: rgba(255, 255, 255, 0.05);
           border: 1px solid rgba(255, 255, 255, 0.1);
         }
         @media (max-width: 768px) {
           .hero-gradient {
             min-height: 100vh;
           }
         }
       `}} />
     </Head>

     <div className="min-h-screen bg-gray-900 text-white">
       {/* Navigation */}
       <nav className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-md z-50 border-b border-gray-800">
         <div className="container mx-auto px-4">
           <div className="flex items-center justify-between h-16">
             <div className="flex items-center">
               <Link href="/" className="flex items-center space-x-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                   <Sparkles className="h-5 w-5 text-white" />
                 </div>
                 <span className="text-xl font-bold">NestEgg</span>
               </Link>
             </div>
             
             {/* Desktop Navigation */}
             <div className="hidden md:flex items-center space-x-8">
               <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
               <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How It Works</a>
               <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Reviews</a>
               <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
               <a href="#faq" className="text-gray-300 hover:text-white transition-colors">FAQ</a>
               <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                 Login
               </Link>
               <Link href="/signup" className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all inline-block">
                 Get Started Free
               </Link>
             </div>
             
             {/* Mobile Menu Button */}
             <button 
               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
               className="md:hidden p-2 text-gray-300 hover:text-white"
               aria-label="Toggle menu"
             >
               {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
             </button>
           </div>
         </div>
         
         {/* Mobile Navigation */}
         {mobileMenuOpen && (
           <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="md:hidden bg-gray-800 border-t border-gray-700"
           >
             <div className="px-4 py-4 space-y-3">
               <a href="#features" className="block text-gray-300 hover:text-white transition-colors">Features</a>
               <a href="#how-it-works" className="block text-gray-300 hover:text-white transition-colors">How It Works</a>
               <a href="#testimonials" className="block text-gray-300 hover:text-white transition-colors">Reviews</a>
               <a href="#pricing" className="block text-gray-300 hover:text-white transition-colors">Pricing</a>
               <a href="#faq" className="block text-gray-300 hover:text-white transition-colors">FAQ</a>
               <Link href="/login" className="block text-gray-300 hover:text-white transition-colors">
                 Login
               </Link>
               <Link href="/signup" className="block w-full px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full font-medium text-center">
                 Get Started Free
               </Link>
             </div>
           </motion.div>
         )}
       </nav>

       {/* Hero Section */}
       <section className="hero-gradient pt-24 pb-20 px-4">
         <div className="container mx-auto max-w-6xl">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
             className="text-center"
           >
             <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
               NestEgg: Your DIY Net-Worth & Retirement Planner
             </h1>
             <p className="text-xl md:text-2xl text-gray-100 mb-8 max-w-3xl mx-auto">
               Track your net worth, plan for retirement, and master your finances — all without sharing bank passwords. 
               The secure, low-cost alternative to Mint and YNAB.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <Link href="/signup" className="px-8 py-4 bg-white text-purple-700 rounded-full font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center">
                 Get Started - 30 Days Free
                 <ArrowRight className="ml-2 h-5 w-5" />
               </Link>
               <Link href="/login" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold text-lg hover:bg-white hover:text-purple-700 transition-all flex items-center justify-center">
                 Sign In
               </Link>
             </div>
             <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
               <div className="flex items-center">
                 <Check className="h-5 w-5 mr-2 text-green-400" />
                 <span>No Bank Login Required</span>
               </div>
               <div className="flex items-center">
                 <Check className="h-5 w-5 mr-2 text-green-400" />
                 <span>256-bit Encryption</span>
               </div>
               <div className="flex items-center">
                 <Check className="h-5 w-5 mr-2 text-green-400" />
                 <span>Cancel Anytime</span>
               </div>
             </div>
           </motion.div>
         </div>
       </section>

       {/* Trust Badges */}
       <section className="py-12 bg-gray-800/50 border-y border-gray-700">
         <div className="container mx-auto px-4">
           <div className="flex flex-wrap justify-center items-center gap-8 text-gray-400">
             <div className="flex items-center gap-2">
               <Users className="h-5 w-5" />
               <span className="text-sm">Trusted by 50,000+ DIY Savers</span>
             </div>
             <div className="flex items-center gap-2">
               <Lock className="h-5 w-5" />
               <span className="text-sm">Bank-Grade Security</span>
             </div>
             <div className="flex items-center gap-2">
               <Award className="h-5 w-5" />
               <span className="text-sm">4.8/5 Average Rating</span>
             </div>
             <div className="flex items-center gap-2">
               <HeartHandshake className="h-5 w-5" />
               <span className="text-sm">30-Day Money Back</span>
             </div>
           </div>
         </div>
       </section>

       {/* Features Section */}
       <section id="features" className="py-20 px-4">
         <div className="container mx-auto max-w-6xl">
           <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             transition={{ duration: 0.6 }}
             className="text-center mb-12"
           >
             <h2 className="text-3xl md:text-4xl font-bold mb-4">
               All-in-One Budgeting & Investment Dashboard
             </h2>
             <p className="text-xl text-gray-300 max-w-3xl mx-auto">
               Everything you need for complete financial control. No compromises, no bank passwords, no high fees.
             </p>
           </motion.div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {features.map((feature, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, delay: index * 0.1 }}
                 className="feature-card rounded-xl p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all"
               >
                 <div className={`inline-flex p-3 rounded-lg bg-gray-800/50 ${feature.color} mb-4`}>
                   {feature.icon}
                 </div>
                 <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                 <p className="text-gray-300">{feature.description}</p>
               </motion.div>
             ))}
           </div>
         </div>
       </section>

       {/* How It Works Section */}
       <section id="how-it-works" className="py-20 px-4 bg-gray-800/30">
         <div className="container mx-auto max-w-6xl">
           <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             transition={{ duration: 0.6 }}
             className="text-center mb-12"
           >
             <h2 className="text-3xl md:text-4xl font-bold mb-4">
               Track Your Net Worth Securely — No Full Bank Logins
             </h2>
             <p className="text-xl text-gray-300 max-w-3xl mx-auto">
               Unlike Mint or Personal Capital, we never ask for your banking credentials. 
               Stay secure while getting Monarch-like insights.
             </p>
           </motion.div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
               className="text-center"
             >
               <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="text-2xl font-bold">1</span>
               </div>
               <h3 className="text-xl font-semibold mb-2">Add Accounts</h3>
               <p className="text-gray-300">
                 Manually enter account balances or import via CSV. Your bank passwords stay with you.
               </p>
             </motion.div>
             
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="text-center"
             >
               <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="text-2xl font-bold">2</span>
               </div>
               <h3 className="text-xl font-semibold mb-2">Track Everything</h3>
               <p className="text-gray-300">
                 Monitor investments, budgets, and net worth with powerful analytics and visualizations.
               </p>
             </motion.div>
             
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6, delay: 0.4 }}
               className="text-center"
             >
               <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="text-2xl font-bold">3</span>
               </div>
               <h3 className="text-xl font-semibold mb-2">Plan & Achieve</h3>
               <p className="text-gray-300">
                 Set goals, plan retirement, and make informed decisions with AI-powered insights.
               </p>
             </motion.div>
           </div>
         </div>
       </section>

       {/* Retirement Planning Section */}
       <section className="py-20 px-4">
         <div className="container mx-auto max-w-6xl">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
             >
               <h2 className="text-3xl md:text-4xl font-bold mb-6">
                 Plan for Retirement with Low-Cost Tools
               </h2>
               <p className="text-xl text-gray-300 mb-6">
                 Professional-grade retirement planning without the advisor fees. 
                 Our Monte Carlo simulations and projection tools rival services costing 10x more.
               </p>
               <ul className="space-y-3 mb-8">
                 <li className="flex items-start">
                   <Check className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                   <span className="text-gray-300">Monte Carlo analysis with 1000+ scenarios</span>
                 </li>
                 <li className="flex items-start">
                   <Check className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                   <span className="text-gray-300">Social Security optimization strategies</span>
                 </li>
                 <li className="flex items-start">
                   <Check className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                   <span className="text-gray-300">Tax-efficient withdrawal planning</span>
                 </li>
                 <li className="flex items-start">
                   <Check className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                   <span className="text-gray-300">Healthcare cost estimates in retirement</span>
                 </li>
               </ul>
               <Link href="/signup" className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
                 Try Retirement Planner
               </Link>
             </motion.div>
             
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
               className="relative"
             >
               <div className="feature-card rounded-xl p-8">
                 <div className="bg-gray-800 rounded-lg p-6 mb-4">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="text-lg font-semibold">Retirement Goal</h4>
                     <span className="text-2xl font-bold text-green-400">$2.5M</span>
                   </div>
                   <div className="space-y-3">
                     <div>
                       <div className="flex justify-between text-sm mb-1">
                         <span className="text-gray-400">Current Progress</span>
                         <span>68%</span>
                       </div>
                       <div className="w-full bg-gray-700 rounded-full h-2">
                         <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full" style={{width: '68%'}}></div>
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="text-gray-400">Monthly Saving</span>
                         <p className="font-semibold">$3,500</p>
                       </div>
                       <div>
                         <span className="text-gray-400">Years to Goal</span>
                         <p className="font-semibold">12.3</p>
                       </div>
                     </div>
                   </div>
                 </div>
                 <div className="text-center text-sm text-gray-400">
                   95% confidence of success based on 1000 simulations
                 </div>
               </div>
             </motion.div>
           </div>
         </div>
       </section>

       {/* Testimonials Section */}
       <section id="testimonials" className="py-20 px-4 bg-gray-800/30">
         <div className="container mx-auto max-w-6xl">
           <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             transition={{ duration: 0.6 }}
             className="text-center mb-12"
           >
             <h2 className="text-3xl md:text-4xl font-bold mb-4">
               Loved by DIY Finance Enthusiasts
             </h2>
             <p className="text-xl text-gray-300">
               Join thousands who've taken control of their financial future
             </p>
           </motion.div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {testimonials.map((testimonial, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, delay: index * 0.1 }}
                 className="feature-card rounded-xl p-6"
               >
                 <div className="flex items-center mb-4">
                   <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                     {testimonial.image}
                   </div>
                   <div>
                     <h4 className="font-semibold">{testimonial.name}</h4>
                     <p className="text-sm text-gray-400">{testimonial.role}</p>
                   </div>
                 </div>
                 <div className="flex mb-3">
                   {[...Array(testimonial.rating)].map((_, i) => (
                     <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                   ))}
                 </div>
                 <p className="text-gray-300 italic">"{testimonial.content}"</p>
               </motion.div>
             ))}
           </div>
         </div>
       </section>

       {/* Pricing Section */}
       <section id="pricing" className="py-20 px-4">
         <div className="container mx-auto max-w-4xl">
           <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             transition={{ duration: 0.6 }}
             className="text-center mb-12"
           >
             <h2 className="text-3xl md:text-4xl font-bold mb-4">
               Simple, Transparent Pricing
             </h2>
             <p className="text-xl text-gray-300">
               One low price. All features. No hidden fees.
             </p>
           </motion.div>
           
           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.6 }}
             className="feature-card rounded-2xl p-8 max-w-md mx-auto"
           >
             <div className="text-center mb-6">
               <h3 className="text-2xl font-bold mb-2">NestEgg Pro</h3>
               <div className="flex items-baseline justify-center">
                 <span className="text-5xl font-bold">$4.99</span>
                 <span className="text-gray-400 ml-2">/month</span>
               </div>
               <p className="text-gray-400 mt-2">Billed monthly. Cancel anytime.</p>
             </div>
             
             <ul className="space-y-3 mb-8">
               <li className="flex items-center">
                 <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                 <span>Unlimited accounts & transactions</span>
               </li>
               <li className="flex items-center">
                 <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                 <span>Advanced retirement planning</span>
               </li>
               <li className="flex items-center">
                 <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                 <span>Investment tracking & analysis</span>
               </li>
               <li className="flex items-center">
                 <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                 <span>Tax optimization tools</span>
               </li>
               <li className="flex items-center">
                 <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                 <span>Mobile app access</span>
               </li>
               <li className="flex items-center">
                 <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                 <span>Priority support</span>
               </li>
             </ul>
             
             <Link href="/signup" className="block w-full px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full font-semibold text-lg hover:shadow-lg hover:shadow-indigo-500/25 transition-all text-center">
               Start Free Trial
             </Link>
             
             <p className="text-center text-sm text-gray-400 mt-4">
               No credit card required • 30-day money-back guarantee
             </p>
           </motion.div>
           
           <div className="mt-12 text-center">
             <p className="text-gray-300 mb-4">Compare to competitors:</p>
             <div className="inline-grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
               <div>
                 <p className="text-gray-500 line-through">Mint Premium</p>
                 <p className="font-semibold">$16.99/mo</p>
               </div>
               <div>
                 <p className="text-gray-500 line-through">YNAB</p>
                 <p className="font-semibold">$14.99/mo</p>
               </div>
               <div>
                 <p className="text-gray-500 line-through">Monarch</p>
                 <p className="font-semibold">$14.99/mo</p>
               </div>
               <div>
                 <p className="text-gray-500 line-through">Tiller</p>
                 <p className="font-semibold">$9.99/mo</p>
               </div>
             </div>
           </div>
         </div>
       </section>

       {/* FAQ Section */}
       <section id="faq" className="py-20 px-4 bg-gray-800/30">
         <div className="container mx-auto max-w-3xl">
           <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             transition={{ duration: 0.6 }}
             className="text-center mb-12"
           >
             <h2 className="text-3xl md:text-4xl font-bold mb-4">
               Frequently Asked Questions
             </h2>
             <p className="text-xl text-gray-300">
               Everything you need to know about NestEgg
             </p>
           </motion.div>
           
           <div className="space-y-4">
             {faqs.map((faq, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, delay: index * 0.1 }}
                 className="feature-card rounded-xl overflow-hidden"
               >
                 <button
                   onClick={() => toggleFaq(index)}
                   className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                   aria-expanded={faqOpen[index]}
                 >
                   <h3 className="font-semibold text-lg">{faq.question}</h3>
                   <ChevronDown className={`h-5 w-5 transition-transform ${faqOpen[index] ? 'rotate-180' : ''}`} />
                 </button>
                 {faqOpen[index] && (
                   <div className="px-6 pb-4">
                     <p className="text-gray-300">{faq.answer}</p>
                   </div>
                 )}
               </motion.div>
             ))}
           </div>
         </div>
       </section>

       {/* CTA Section */}
       <section className="py-20 px-4">
         <div className="container mx-auto max-w-4xl">
           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.6 }}
             className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-center"
           >
             <h2 className="text-3xl md:text-4xl font-bold mb-4">
               Take Control of Your Financial Future
             </h2>
             <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
               Join thousands of smart savers who've ditched expensive financial apps for NestEgg's 
               powerful DIY tools. Your single-stop finance solution awaits.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <Link href="/signup" className="px-8 py-4 bg-white text-purple-700 rounded-full font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center">
                 Start Your Free Trial
                 <ArrowRight className="ml-2 h-5 w-5" />
               </Link>
               <Link href="/login" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold text-lg hover:bg-white hover:text-purple-700 transition-all">
                 Sign In to Your Account
               </Link>
             </div>
             <p className="text-sm text-gray-200 mt-6">
               No credit card required • 30-day free trial • Cancel anytime
             </p>
           </motion.div>
         </div>
       </section>

       {/* Footer */}
       <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4">
         <div className="container mx-auto max-w-6xl">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
             <div>
               <div className="flex items-center space-x-2 mb-4">
                 <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                   <Sparkles className="h-5 w-5 text-white" />
                 </div>
                 <span className="text-xl font-bold">NestEgg</span>
               </div>
               <p className="text-gray-400 text-sm">
                 Your DIY financial command center. Track net worth, plan retirement, and achieve financial freedom.
               </p>
             </div>
             
             <div>
               <h4 className="font-semibold mb-4">Product</h4>
               <ul className="space-y-2 text-gray-400">
                    <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                    <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                    <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
                    <li><Link href="/roadmap" className="hover:text-white transition-colors">Roadmap</Link></li>
               </ul>
             </div>
             
             <div>
               <h4 className="font-semibold mb-4">Resources</h4>
               <ul className="space-y-2 text-gray-400">
                      <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                      <li><Link href="/guides" className="hover:text-white transition-colors">Guides</Link></li>
                      <li><Link href="/calculator" className="hover:text-white transition-colors">Calculators</Link></li>
                      <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
               </ul>
             </div>
             
             <div>
               <h4 className="font-semibold mb-4">Company</h4>
               <ul className="space-y-2 text-gray-400">
                      <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                      <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                      <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                      <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
               </ul>
             </div>
           </div>
           
           <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
             <p className="text-gray-400 text-sm mb-4 md:mb-0">
               © 2024 NestEgg. All rights reserved.
             </p>
             <div className="flex items-center space-x-6">
               <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
                 Sign In
               </Link>
               <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">
                 Get Started Free
               </Link>
             </div>
           </div>
         </div>
       </footer>
     </div>
   </>
 );
}