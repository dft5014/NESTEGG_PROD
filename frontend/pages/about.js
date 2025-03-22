import React, { useState } from 'react';
import { 
  PiggyBank, 
  LineChart, 
  Wallet, 
  Shield, 
  Target, 
  Clock,
  Check,
  Star,
  Lock,
  Zap
} from 'lucide-react';

export default function NestEggPage() {
  const [email, setEmail] = useState('');

  const features = [
    {
      icon: <LineChart className="w-12 h-12 text-blue-500" />,
      title: "Comprehensive Portfolio Tracking",
      description: "Consolidate all your retirement accounts in one intuitive dashboard. Track 401(k)s, IRAs, and other investment accounts seamlessly."
    },
    {
      icon: <Target className="w-12 h-12 text-green-500" />,
      title: "Retirement Goal Projection",
      description: "Set personalized retirement goals and get real-time insights into your progress. Understand exactly where you stand financially."
    },
    {
      icon: <Shield className="w-12 h-12 text-purple-500" />,
      title: "Advanced Security",
      description: "Bank-level encryption and multi-factor authentication to keep your financial data completely secure and private."
    },
    {
      icon: <Clock className="w-12 h-12 text-orange-500" />,
      title: "Performance Over Time",
      description: "Analyze your investment performance across different time horizons. Identify trends and make informed decisions."
    }
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "Free",
      features: [
        "Up to 2 Investment Accounts",
        "Basic Performance Tracking",
        "Monthly Insights"
      ],
      icon: <Zap className="w-10 h-10 text-blue-500" />
    },
    {
      name: "Pro",
      price: "$9.99/month",
      features: [
        "Unlimited Accounts",
        "Advanced Analytics",
        "Quarterly Goal Projections",
        "Priority Support"
      ],
      icon: <Star className="w-10 h-10 text-purple-500" />
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "Unlimited Accounts",
        "Full API Access",
        "Dedicated Account Manager",
        "Advanced Reporting"
      ],
      icon: <Lock className="w-10 h-10 text-green-500" />
    }
  ];

  const testimonials = [
    {
      quote: "NestEgg transformed how I track my retirement investments. It's like having a financial advisor in my pocket!",
      name: "Sarah M.",
      role: "Marketing Director"
    },
    {
      quote: "The simplicity and depth of insights are unmatched. I finally feel in control of my financial future.",
      name: "James T.",
      role: "Software Engineer"
    }
  ];

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <div className="min-h-screen bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-extrabold text-gray-900 mb-4 flex items-center justify-center gap-4">
              <PiggyBank className="w-16 h-16 text-blue-600" />
              NestEgg
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your comprehensive retirement tracking solution. Simplify your financial planning, 
              gain clarity on your investments, and confidently navigate your path to financial freedom.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="flex items-center mb-4">
                  {feature.icon}
                  <h2 className="text-2xl font-bold ml-4 text-gray-800">{feature.title}</h2>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Testimonials Section */}
          <section className="bg-white py-16 rounded-xl shadow-md mb-16">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-12">What Our Users Say</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {testimonials.map((testimonial, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-100 p-6 rounded-xl shadow-md"
                  >
                    <p className="italic mb-4">"{testimonial.quote}"</p>
                    <div className="font-semibold">
                      <span>{testimonial.name}</span>
                      <span className="block text-gray-500 text-sm">{testimonial.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="py-16 bg-gray-100 rounded-xl">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {pricingTiers.map((tier, index) => (
                  <div 
                    key={index} 
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center mb-4">
                      {tier.icon}
                      <h3 className="text-2xl font-bold ml-4">{tier.name}</h3>
                    </div>
                    <p className="text-3xl font-extrabold mb-6">{tier.price}</p>
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                      {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Newsletter Signup */}
          <section className="bg-blue-600 text-white py-16 rounded-xl mt-16">
            <div className="max-w-md mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Stay Ahead of Your Finances</h2>
              <p className="mb-8">Get monthly investment insights and NestEgg updates</p>
              <div className="flex">
                <input 
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-grow p-3 rounded-l-lg text-gray-900"
                />
                <button 
                  className="bg-green-500 text-white px-6 rounded-r-lg hover:bg-green-600 transition-colors"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}