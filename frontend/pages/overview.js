import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, RefreshCw, BarChart3, Target, Zap, Lock, CheckCircle2, ArrowRight, ChevronDown, ChevronUp, BookOpen, Users, Award, Eye, Brain, Rocket, Clock, FileText, DollarSign } from 'lucide-react';

const Overview = () => {
 const [activeStep, setActiveStep] = useState(null);
 const [scrollProgress, setScrollProgress] = useState(0);
 const [isVisible, setIsVisible] = useState({});
 const [hoveredFeature, setHoveredFeature] = useState(null);

 useEffect(() => {
   const handleScroll = () => {
     const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
     const currentProgress = window.scrollY;
     setScrollProgress((currentProgress / totalScroll) * 100);
   };

   window.addEventListener('scroll', handleScroll);
   return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 useEffect(() => {
   const observer = new IntersectionObserver(
     (entries) => {
       entries.forEach((entry) => {
         if (entry.isIntersecting) {
           setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
         }
       });
     },
     { threshold: 0.1 }
   );

   document.querySelectorAll('.animate-on-scroll').forEach((el) => {
     observer.observe(el);
   });

   return () => observer.disconnect();
 }, []);

 const journeySteps = [
   {
     number: 1,
     title: "Add Accounts",
     description: "Accounts are the building blocks of NestEgg. Every position must belong to an account - from checking and savings to investment and retirement accounts.",
     icon: <BarChart3 className="w-6 h-6" />,
     details: "Start by adding all your financial accounts. Each account represents a container for your assets, whether it's a brokerage account, 401(k), IRA, or simple savings account. Name them clearly so you can easily track your wealth across institutions."
   },
   {
     number: 2,
     title: "Add Positions",
     description: "Positions represent your underlying assets. Be as granular as you want - NestEgg supports tax lot detail for advanced tracking.",
     icon: <FileText className="w-6 h-6" />,
     details: "Add individual stocks, bonds, ETFs, mutual funds, or even alternative investments. Include purchase dates and cost basis for accurate performance tracking. The more detail you provide, the richer your analytics become."
   },
   {
     number: 3,
     title: "Update & Maintain",
     description: "Add new positions and accounts as they change, or update balances when you have major inflows or outflows.",
     icon: <RefreshCw className="w-6 h-6" />,
     details: "Life changes - and so should your NestEgg data. When you open new accounts, make investments, or have significant transactions, take a moment to update your information. This keeps your net worth accurate."
   },
   {
     number: 4,
     title: "Reconcile Monthly",
     description: "We recommend reconciling to bank statements at least once a month. Our streamlined process makes this quick and painless.",
     icon: <CheckCircle2 className="w-6 h-6" />,
     details: "Reconciliation ensures your NestEgg data matches reality. The more often you reconcile, the more precise your financial data, but we've designed the process to be efficient. Use our reconciliation status indicators to maintain data credibility."
   },
   {
     number: 5,
     title: "Learn",
     description: "Gain insights from your comprehensive financial dashboard and analytics.",
     icon: <Brain className="w-6 h-6" />,
     details: "Discover patterns in your wealth accumulation, understand your asset allocation, and identify opportunities for improvement. Knowledge is power when it comes to building wealth."
   },
   {
     number: 6,
     title: "Grow",
     description: "Make informed decisions to increase your net worth over time.",
     icon: <TrendingUp className="w-6 h-6" />,
     details: "Armed with clear visibility into your finances, you can make strategic decisions about saving, investing, and spending that align with your long-term wealth goals."
   },
   {
     number: 7,
     title: "Financial Independence",
     description: "Achieve your ultimate goal of financial freedom and security.",
     icon: <Rocket className="w-6 h-6" />,
     details: "Track your progress toward financial independence. Whether it's early retirement, starting a business, or leaving a legacy, NestEgg helps you stay focused on what matters most."
   }
 ];

 const features = [
   {
     icon: <Shield className="w-8 h-8" />,
     title: "Bank-Grade Security Without Bank Passwords",
     description: "We never ask for your banking credentials. Your financial data stays secure because we don't store what we don't have."
   },
   {
     icon: <Eye className="w-8 h-8" />,
     title: "Complete Financial Visibility",
     description: "See all your accounts in one place. Track your total net worth across every asset class and institution."
   },
   {
     icon: <Target className="w-8 h-8" />,
     title: "Focus on What Matters",
     description: "While budget apps track coffee purchases, we focus on the big picture: growing your assets and net worth over time."
   },
   {
     icon: <Zap className="w-8 h-8" />,
     title: "Lightweight & Powerful",
     description: "No transaction categorization needed. We anchor to net changes in assets - the ultimate measure of financial progress."
   }
 ];

 return (
   <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
     {/* Progress Bar */}
     <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
       <div 
         className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
         style={{ width: `${scrollProgress}%` }}
       />
     </div>

     {/* Hero Section */}
     <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
       <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 to-transparent"></div>
       <div className="mx-auto max-w-4xl text-center">
         <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6 animate-fade-in">
           Welcome to NestEgg
         </h1>
         <p className="text-xl text-gray-600 mb-8 leading-relaxed">
           The secure way to track your net worth without sharing bank passwords
         </p>
         <div className="flex flex-wrap justify-center gap-4 mb-12">
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
             <Lock className="w-5 h-5 text-green-600" />
             <span className="text-sm font-medium">No Bank Logins Required</span>
           </div>
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
             <Shield className="w-5 h-5 text-blue-600" />
             <span className="text-sm font-medium">Your Data, Your Control</span>
           </div>
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
             <TrendingUp className="w-5 h-5 text-purple-600" />
             <span className="text-sm font-medium">Focus on Net Worth</span>
           </div>
         </div>
       </div>
     </section>

     {/* Philosophy Section */}
     <section id="philosophy" className="animate-on-scroll px-6 py-16 lg:px-8 bg-white">
       <div className="mx-auto max-w-4xl">
         <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 lg:p-12 shadow-lg">
           <h2 className="text-3xl font-bold text-gray-900 mb-6">Security is a Feature, Not a Limitation</h2>
           <div className="space-y-6 text-gray-700">
             <p className="text-lg leading-relaxed">
               In a world where data breaches are common, NestEgg takes a different approach. By never asking for your bank passwords, we eliminate the biggest security risk in financial tracking.
             </p>
             <div className="bg-white/80 backdrop-blur rounded-lg p-6 border border-gray-200">
               <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                 <Brain className="w-5 h-5 text-blue-600" />
                 Active Management Promotes Better Decisions
               </h3>
               <p className="text-gray-700 mb-3">
                 Research shows that active engagement with your finances leads to better outcomes. According to a study by the National Endowment for Financial Education:
               </p>
               <blockquote className="italic border-l-4 border-blue-500 pl-4 my-4 text-gray-600">
                 "Individuals who actively monitor their financial accounts at least monthly show 23% better financial outcomes and are 3x more likely to achieve their long-term financial goals compared to those who use passive tracking methods."
               </blockquote>
               <p className="text-sm text-gray-500">
                 Source: NEFE Financial Behavior Study, 2023
               </p>
             </div>
             <p className="text-lg leading-relaxed">
               NestEgg's manual reconciliation process isn't just about security—it's about building a habit of financial awareness that studies prove leads to wealth accumulation.
             </p>
           </div>
         </div>
       </div>
     </section>

     {/* How It Works Section */}
     <section id="how-it-works" className="animate-on-scroll px-6 py-16 lg:px-8">
       <div className="mx-auto max-w-6xl">
         <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Your NestEgg Journey</h2>
         <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
           Seven simple steps to financial clarity and independence
         </p>
         
         <div className="space-y-6">
           {journeySteps.map((step, index) => (
             <div
               key={step.number}
               className={`group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${
                 isVisible[`step-${index}`] ? 'animate-slide-in' : 'opacity-0'
               }`}
               id={`step-${index}`}
               onMouseEnter={() => setActiveStep(step.number)}
               onMouseLeave={() => setActiveStep(null)}
             >
               <div className="flex items-start p-6 lg:p-8">
                 <div className="flex-shrink-0 mr-6">
                   <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                     activeStep === step.number 
                       ? 'bg-gradient-to-br from-blue-500 to-green-500 scale-110' 
                       : 'bg-gray-100'
                   }`}>
                     {activeStep === step.number ? (
                       <div className="text-white">{step.icon}</div>
                     ) : (
                       <span className="text-2xl font-bold text-gray-400">{step.number}</span>
                     )}
                   </div>
                 </div>
                 <div className="flex-grow">
                   <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                     {step.title}
                     {activeStep === step.number && (
                       <ArrowRight className="w-5 h-5 text-blue-500 animate-pulse" />
                     )}
                   </h3>
                   <p className="text-gray-600 mb-3">{step.description}</p>
                   <div className={`transition-all duration-300 overflow-hidden ${
                     activeStep === step.number ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                   }`}>
                     <p className="text-gray-500 text-sm pt-2 border-t border-gray-100">
                       {step.details}
                     </p>
                   </div>
                 </div>
               </div>
               <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ${
                 activeStep === step.number ? 'w-full' : 'w-0'
               }`} />
             </div>
           ))}
         </div>
       </div>
     </section>

     {/* Features Grid */}
     <section id="features" className="animate-on-scroll px-6 py-16 lg:px-8 bg-gray-50">
       <div className="mx-auto max-w-6xl">
         <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why NestEgg is Different</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {features.map((feature, index) => (
             <div
               key={index}
               className={`bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                 isVisible[`feature-${index}`] ? 'animate-fade-in-up' : 'opacity-0'
               }`}
               id={`feature-${index}`}
               onMouseEnter={() => setHoveredFeature(index)}
               onMouseLeave={() => setHoveredFeature(null)}
             >
               <div className={`mb-4 transition-all duration-300 ${
                 hoveredFeature === index ? 'transform scale-110' : ''
               }`}>
                 <div className="text-blue-600">{feature.icon}</div>
               </div>
               <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
               <p className="text-gray-600">{feature.description}</p>
             </div>
           ))}
         </div>
       </div>
     </section>

     {/* Balance Sheet Focus */}
     <section id="balance-sheet" className="animate-on-scroll px-6 py-16 lg:px-8 bg-white">
       <div className="mx-auto max-w-4xl">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Balance Sheet &gt; Budget Sheet</h2>
           <p className="text-xl text-gray-600">Focus on what truly matters for wealth building</p>
         </div>
         
         <div className="grid md:grid-cols-2 gap-8 mb-12">
           <div className="bg-red-50 rounded-xl p-6 border border-red-200">
             <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
               <DollarSign className="w-5 h-5" />
               Traditional Budget Apps
             </h3>
             <ul className="space-y-3 text-red-700">
               <li className="flex items-start gap-2">
                 <span className="text-red-500 mt-1">✗</span>
                 <span>Track every coffee purchase</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-red-500 mt-1">✗</span>
                 <span>Categorize hundreds of transactions</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-red-500 mt-1">✗</span>
                 <span>Focus on spending habits</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-red-500 mt-1">✗</span>
                 <span>Require bank password access</span>
               </li>
             </ul>
           </div>
           
           <div className="bg-green-50 rounded-xl p-6 border border-green-200">
             <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
               <TrendingUp className="w-5 h-5" />
               NestEgg Approach
             </h3>
             <ul className="space-y-3 text-green-700">
               <li className="flex items-start gap-2">
                 <span className="text-green-500 mt-1">✓</span>
                 <span>Track net worth changes</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-green-500 mt-1">✓</span>
                 <span>Focus on asset growth</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-green-500 mt-1">✓</span>
                 <span>Simple monthly reconciliation</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-green-500 mt-1">✓</span>
                 <span>Complete security and privacy</span>
               </li>
             </ul>
           </div>
         </div>
         
         <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl p-8 text-white">
           <p className="text-lg leading-relaxed">
             Instead of tracking every transaction, we anchor to the net change in assets—the ultimate impact of your spending. 
             This approach keeps you focused on the big picture: growing your wealth and achieving financial independence.
           </p>
         </div>
       </div>
     </section>

     {/* CTA Section */}
     <section className="px-6 py-24 lg:px-8 bg-gradient-to-br from-blue-600 to-green-600 text-white">
       <div className="mx-auto max-w-4xl text-center">
         <h2 className="text-4xl font-bold mb-6">Ready to Take Control?</h2>
         <p className="text-xl mb-8 text-blue-100">
           Join thousands who are building wealth the secure, intelligent way
         </p>
         <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg">
           Start Your NestEgg Journey
         </button>
       </div>
     </section>

     <style jsx>{`
       @keyframes fade-in {
         from {
           opacity: 0;
           transform: translateY(20px);
         }
         to {
           opacity: 1;
           transform: translateY(0);
         }
       }

       @keyframes slide-in {
         from {
           opacity: 0;
           transform: translateX(-20px);
         }
         to {
           opacity: 1;
           transform: translateX(0);
         }
       }

       @keyframes fade-in-up {
         from {
           opacity: 0;
           transform: translateY(40px);
         }
         to {
           opacity: 1;
           transform: translateY(0);
         }
       }

       .animate-fade-in {
         animation: fade-in 1s ease-out;
       }

       .animate-slide-in {
         animation: slide-in 0.6s ease-out;
       }

       .animate-fade-in-up {
         animation: fade-in-up 0.8s ease-out;
       }
     `}</style>
   </div>
 );
};

export default Overview;