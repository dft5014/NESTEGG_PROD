// pages/tutorial.js - NestEgg Getting Started Guide
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit3, RefreshCw, CheckCircle, Upload, ArrowRight, ArrowLeft,
  Wallet, BarChart3, PieChart, Shield, TrendingUp, Home, CreditCard,
  DollarSign, Target, Sparkles, BookOpen, ChevronDown, ChevronUp,
  FileSpreadsheet, Building2, Briefcase, LineChart, Receipt, Coins,
  HelpCircle, ExternalLink
} from 'lucide-react';

// =============================================================================
// TUTORIAL CONTENT - Business-focused copy
// =============================================================================

const tutorialSections = [
  {
    id: 'welcome',
    title: 'What is NestEgg?',
    icon: Sparkles,
    color: 'indigo',
    content: {
      headline: 'Your Complete Financial Picture, Under Your Control',
      description: `NestEgg is a privacy-first portfolio management platform designed for individuals who want full visibility into their finances without sharing sensitive banking credentials. Unlike traditional financial aggregators, NestEgg puts you in control of your data.`,
      benefits: [
        {
          title: 'Privacy First',
          description: 'No bank connections required. Your credentials stay with you.',
          icon: Shield
        },
        {
          title: 'Complete Picture',
          description: 'Track stocks, crypto, real estate, cash, and liabilities in one place.',
          icon: PieChart
        },
        {
          title: 'Performance Insights',
          description: 'See how your wealth changes over time with detailed analytics.',
          icon: TrendingUp
        },
        {
          title: 'Manual Control',
          description: 'Enter data on your schedule, from statements or memory.',
          icon: Target
        }
      ]
    }
  },
  {
    id: 'workflow',
    title: 'How NestEgg Works',
    icon: Target,
    color: 'emerald',
    content: {
      headline: 'Four Simple Steps to Financial Clarity',
      steps: [
        {
          number: 1,
          title: 'Create Your Accounts',
          description: 'Set up accounts for each financial institution you use—brokerages, banks, retirement accounts, and more. Think of these as containers for your assets.',
          example: 'Example: Create accounts for "Fidelity 401k", "Chase Checking", "Coinbase", or "Primary Residence"'
        },
        {
          number: 2,
          title: 'Add Your Positions',
          description: 'Within each account, add your holdings. Enter stocks, ETFs, crypto, cash balances, real estate equity, and other assets with their current values and cost basis.',
          example: 'Example: Add 100 shares of AAPL purchased at $150, or $50,000 in your money market fund'
        },
        {
          number: 3,
          title: 'Import from Statements',
          description: 'Speed up data entry by importing positions directly from your brokerage statements. Upload CSV or Excel files and NestEgg will parse your holdings automatically.',
          example: 'Example: Download your monthly statement from Schwab and import it directly'
        },
        {
          number: 4,
          title: 'Track and Analyze',
          description: 'Once your data is in, NestEgg automatically calculates your net worth, tracks performance over time, and provides insights into your asset allocation and risk exposure.',
          example: 'Example: See your net worth grow over months, identify concentration risks, track dividend income'
        }
      ]
    }
  },
  {
    id: 'add-modal',
    title: 'Adding Data',
    icon: Plus,
    color: 'emerald',
    content: {
      headline: 'The Add Button: Your Starting Point',
      buttonLocation: 'Located in the navigation bar with a green plus icon',
      description: `The Add button opens the Quick Start wizard, your primary tool for entering financial data into NestEgg. This guided process walks you through creating accounts and adding positions step by step.`,
      features: [
        {
          title: 'Create Accounts',
          description: 'Set up new accounts by specifying the institution name, account type (brokerage, bank, retirement, etc.), and any relevant details.',
          tip: 'Group related accounts by institution for easier tracking—all your Fidelity accounts under "Fidelity"'
        },
        {
          title: 'Add Positions',
          description: 'Enter your holdings with ticker symbols (for stocks/ETFs), quantities, purchase prices, and purchase dates. NestEgg automatically fetches current market prices.',
          tip: 'Enter your cost basis accurately to track true performance over time'
        },
        {
          title: 'Track Liabilities',
          description: 'Don\'t forget the other side of your balance sheet. Add mortgages, credit cards, loans, and other debts to see your true net worth.',
          tip: 'Include credit card balances even if you pay them off monthly—it helps track spending patterns'
        },
        {
          title: 'Bulk Entry with Excel Templates',
          description: 'Need to add many accounts or positions at once? Download NestEgg\'s Excel templates for accounts or positions, fill them out offline, and upload for instant bulk creation.',
          tip: 'Excel templates are perfect for initial setup when migrating from another tool or entering historical data'
        }
      ],
      whenToUse: 'Use the Add button when you\'re setting up NestEgg for the first time, opening a new account, purchasing new investments, or bulk importing via Excel templates.'
    }
  },
  {
    id: 'edit-modal',
    title: 'Editing Data',
    icon: Edit3,
    color: 'blue',
    content: {
      headline: 'The Edit Button: Keep Your Data Current',
      buttonLocation: 'Located in the navigation bar with a blue pencil icon',
      description: `The Edit button lets you modify or remove existing data in NestEgg. Use it to correct mistakes, update positions after transactions, or remove sold investments.`,
      features: [
        {
          title: 'Modify Positions',
          description: 'Update quantities after buying more shares, adjust cost basis after dividend reinvestments, or correct data entry errors.',
          tip: 'When you sell partial positions, reduce the quantity and adjust cost basis proportionally'
        },
        {
          title: 'Update Account Details',
          description: 'Change account names, update institution information, or reclassify account types as your financial situation evolves.',
          tip: 'Rename accounts to match your statements for easier reconciliation'
        },
        {
          title: 'Remove Holdings',
          description: 'Delete positions you\'ve fully sold or accounts you\'ve closed. NestEgg keeps historical data for performance tracking.',
          tip: 'Delete positions on the date you sold them to maintain accurate historical records'
        }
      ],
      whenToUse: 'Use the Edit button after selling investments, correcting errors, or when account details change.'
    }
  },
  {
    id: 'update-modal',
    title: 'Updating Values',
    icon: RefreshCw,
    color: 'cyan',
    content: {
      headline: 'The Update Button: Refresh Your Numbers',
      buttonLocation: 'Located in the navigation bar with a cyan refresh icon',
      description: `The Update button provides quick access to refresh market prices and update manual balances. Regular updates are essential—NestEgg captures snapshots of your portfolio over time, and consistent updates ensure your historical trends and performance charts accurately reflect your financial journey.`,
      features: [
        {
          title: 'Refresh Market Prices',
          description: 'Pull the latest stock, ETF, crypto, and commodity prices from market data providers. This updates the current value of all your market-priced holdings.',
          tip: 'Market prices update automatically, but manual refresh ensures you see the latest before making decisions'
        },
        {
          title: 'Update Manual Balances',
          description: 'For cash accounts, real estate, and other non-market assets, quickly update current values without opening the full edit interface. These values don\'t update automatically, so regular manual updates are essential.',
          tip: 'Set a monthly calendar reminder to update all manual balances—this keeps your net worth history accurate'
        },
        {
          title: 'Seed New Positions',
          description: 'When updating existing positions reveals new holdings, you can quickly add them to your portfolio from the update interface.',
          tip: 'Use this after dividend reinvestments create fractional shares'
        },
        {
          title: 'Why Frequency Matters',
          description: 'NestEgg records daily snapshots of your portfolio. If manual balances go weeks without updates, your historical charts and trend analysis will show stale data. Monthly updates at minimum ensure your wealth tracking remains meaningful.',
          tip: 'The more frequently you update, the more accurate your "Net Worth Over Time" charts will be'
        }
      ],
      whenToUse: 'Update at least monthly, ideally weekly. Always update before reviewing performance reports or making financial decisions based on your NestEgg data.'
    }
  },
  {
    id: 'reconcile-modal',
    title: 'Reconciling Accounts',
    icon: CheckCircle,
    color: 'violet',
    content: {
      headline: 'The Reconcile Button: Verify Your Data',
      buttonLocation: 'Located in the navigation bar with a violet checkmark icon',
      description: `The Reconcile button helps you verify that your NestEgg data matches your actual statements. This is essential for maintaining accurate records and catching discrepancies.`,
      features: [
        {
          title: 'Compare to Statements',
          description: 'Enter the total value from your brokerage or bank statement and compare it against what NestEgg shows. Identify any differences quickly.',
          tip: 'Reconcile monthly when you receive statements to catch errors early'
        },
        {
          title: 'Find Discrepancies',
          description: 'When totals don\'t match, drill down to identify which positions or values are off. Common causes include missed transactions or price timing differences.',
          tip: 'Small differences (under 1%) are often due to timing—statements may use different closing prices'
        },
        {
          title: 'Track Reconciliation History',
          description: 'Keep a record of when you last verified each account, ensuring no account goes too long without review.',
          tip: 'Set a monthly reminder to reconcile all accounts'
        }
      ],
      whenToUse: 'Use the Reconcile button monthly when you receive account statements, or whenever you suspect data might be out of sync.'
    }
  },
  {
    id: 'import-modal',
    title: 'Importing Statements',
    icon: Upload,
    color: 'amber',
    content: {
      headline: 'The Import Button: Smart Statement Processing',
      buttonLocation: 'Located in the navigation bar with an amber upload icon',
      description: `The Import button is your Swiss Army knife for statement data. Upload brokerage statements or spreadsheets and NestEgg intelligently determines what to do—whether you're adding brand new positions, updating existing balances, or reconciling your current holdings against a statement. It adapts to your needs automatically.`,
      features: [
        {
          title: 'Smart Detection',
          description: 'NestEgg analyzes your uploaded statement and compares it against your existing data. It automatically identifies which positions are new (to be added), which already exist (to be updated), and flags any discrepancies for your review.',
          tip: 'The same import tool works whether you have zero positions or hundreds—it figures out what needs to happen'
        },
        {
          title: 'Add New Positions',
          description: 'When importing positions that don\'t exist in NestEgg yet, they\'re queued for creation. Perfect for initial setup or when you\'ve opened new holdings.',
          tip: 'Great for setting up a new account—import the statement and all positions are created at once'
        },
        {
          title: 'Update Existing Balances',
          description: 'For positions that already exist, import can update quantities and values to match your statement. This is a fast way to sync your data monthly without manual edits.',
          tip: 'Use this monthly when you receive statements—one upload keeps everything current'
        },
        {
          title: 'Reconcile & Validate',
          description: 'Import also serves as a validation tool. See side-by-side comparisons of what your statement shows versus what NestEgg has, helping you catch and correct any differences.',
          tip: 'This is especially useful for catching missed transactions or data entry errors'
        },
        {
          title: 'Template Support',
          description: 'Use NestEgg\'s Excel templates for structured data entry when your brokerage format isn\'t automatically recognized.',
          tip: 'Download the template, fill in your data, and re-upload for clean imports'
        }
      ],
      whenToUse: 'Use Import anytime you have a statement file—for initial setup, monthly updates, or validating your data. It\'s versatile enough to handle all these scenarios from one interface.'
    }
  },
  {
    id: 'pages',
    title: 'Understanding Your Dashboard',
    icon: BarChart3,
    color: 'purple',
    content: {
      headline: 'Navigate Your Financial Data',
      pages: [
        {
          name: 'Portfolio',
          description: 'Your financial headquarters. See net worth, asset allocation, performance over time, and key metrics at a glance. This is where you\'ll spend most of your time.',
          icon: Wallet
        },
        {
          name: 'Accounts',
          description: 'Drill into individual accounts. View holdings by account, see account-level performance, and manage account settings.',
          icon: Building2
        },
        {
          name: 'Positions',
          description: 'See all your holdings across accounts. Filter by asset type, sort by value or performance, and identify your best and worst performers.',
          icon: Briefcase
        },
        {
          name: 'Analytics Studio',
          description: 'Advanced analysis tools. Deep dive into sector allocation, risk metrics, concentration analysis, and detailed performance attribution.',
          icon: LineChart
        },
        {
          name: 'Liabilities',
          description: 'Track what you owe. Monitor mortgages, loans, credit cards, and see how debt reduction impacts your net worth.',
          icon: Receipt
        },
        {
          name: 'Reports',
          description: 'Generate detailed reports. Export performance summaries, tax lot details, and other reports for personal records or tax preparation.',
          icon: FileSpreadsheet
        }
      ]
    }
  },
  {
    id: 'tips',
    title: 'Best Practices',
    icon: Target,
    color: 'rose',
    content: {
      headline: 'Get the Most from NestEgg',
      tips: [
        {
          title: 'Enter Complete Cost Basis',
          description: 'Your cost basis (what you paid) is essential for accurate gain/loss tracking. Take time to enter this correctly—it pays off in meaningful performance insights.',
          importance: 'high'
        },
        {
          title: 'Include All Assets',
          description: 'Don\'t forget cash, real estate equity, and alternative investments. Your net worth picture is only complete when everything is included.',
          importance: 'high'
        },
        {
          title: 'Update Regularly',
          description: 'For the best experience, update manual balances at least monthly. Market prices refresh automatically, but cash and real estate values need your input.',
          importance: 'medium'
        },
        {
          title: 'Reconcile Monthly',
          description: 'Compare NestEgg totals to your actual statements monthly. This catches errors early and ensures your data stays accurate.',
          importance: 'medium'
        },
        {
          title: 'Use Consistent Naming',
          description: 'Name accounts consistently (e.g., "Fidelity - 401k" rather than "retirement account") for easier navigation and reporting.',
          importance: 'low'
        },
        {
          title: 'Track Liabilities Too',
          description: 'Your financial picture isn\'t complete without debt. Include mortgages and loans to see your true net worth, not just assets.',
          importance: 'high'
        }
      ]
    }
  }
];

// =============================================================================
// COMPONENTS
// =============================================================================

const colorClasses = {
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    gradient: 'from-indigo-600 to-purple-600',
    badge: 'bg-indigo-500/20 text-indigo-300'
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    gradient: 'from-emerald-600 to-teal-600',
    badge: 'bg-emerald-500/20 text-emerald-300'
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    gradient: 'from-blue-600 to-cyan-600',
    badge: 'bg-blue-500/20 text-blue-300'
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    gradient: 'from-cyan-600 to-blue-600',
    badge: 'bg-cyan-500/20 text-cyan-300'
  },
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    gradient: 'from-violet-600 to-purple-600',
    badge: 'bg-violet-500/20 text-violet-300'
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    gradient: 'from-amber-600 to-orange-600',
    badge: 'bg-amber-500/20 text-amber-300'
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    gradient: 'from-purple-600 to-pink-600',
    badge: 'bg-purple-500/20 text-purple-300'
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    gradient: 'from-rose-600 to-pink-600',
    badge: 'bg-rose-500/20 text-rose-300'
  }
};

const SectionNavItem = ({ section, isActive, onClick }) => {
  const colors = colorClasses[section.color];
  const Icon = section.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
        isActive
          ? `${colors.bg} ${colors.border} border`
          : 'hover:bg-gray-800/50'
      }`}
    >
      <div className={`p-2 rounded-lg ${colors.bg}`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
        {section.title}
      </span>
    </button>
  );
};

const WelcomeSection = ({ content }) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-3xl font-bold text-white mb-4">{content.headline}</h2>
      <p className="text-gray-300 text-lg leading-relaxed">{content.description}</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {content.benefits.map((benefit, i) => (
        <motion.div
          key={benefit.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-5"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
              <benefit.icon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
              <p className="text-sm text-gray-400">{benefit.description}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const WorkflowSection = ({ content }) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-3xl font-bold text-white mb-4">{content.headline}</h2>
    </div>

    <div className="space-y-4">
      {content.steps.map((step, i) => (
        <motion.div
          key={step.number}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0">
              {step.number}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-gray-300 mb-3">{step.description}</p>
              <div className="bg-gray-800/50 rounded-lg px-4 py-2 text-sm text-gray-400 italic">
                {step.example}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const ModalSection = ({ content, color }) => {
  const colors = colorClasses[color];

  return (
    <div className="space-y-8">
      <div>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 ${colors.badge}`}>
          {content.buttonLocation}
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">{content.headline}</h2>
        <p className="text-gray-300 text-lg leading-relaxed">{content.description}</p>
      </div>

      <div className="space-y-4">
        {content.features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-gray-900/50 border rounded-xl p-5 ${colors.border}`}
          >
            <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-300 text-sm mb-3">{feature.description}</p>
            <div className={`flex items-start gap-2 text-sm ${colors.text}`}>
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feature.tip}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/50">
        <h4 className="font-medium text-white mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          When to Use
        </h4>
        <p className="text-gray-300 text-sm">{content.whenToUse}</p>
      </div>
    </div>
  );
};

const PagesSection = ({ content }) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-3xl font-bold text-white mb-4">{content.headline}</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {content.pages.map((page, i) => (
        <motion.div
          key={page.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-purple-500/30 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
              <page.icon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">{page.name}</h3>
              <p className="text-sm text-gray-400">{page.description}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const TipsSection = ({ content }) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-3xl font-bold text-white mb-4">{content.headline}</h2>
    </div>

    <div className="space-y-4">
      {content.tips.map((tip, i) => {
        const importanceColors = {
          high: 'border-rose-500/30 bg-rose-500/5',
          medium: 'border-amber-500/30 bg-amber-500/5',
          low: 'border-gray-700 bg-gray-900/50'
        };
        const importanceBadge = {
          high: 'bg-rose-500/20 text-rose-300',
          medium: 'bg-amber-500/20 text-amber-300',
          low: 'bg-gray-700 text-gray-400'
        };

        return (
          <motion.div
            key={tip.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`border rounded-xl p-5 ${importanceColors[tip.importance]}`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="font-semibold text-white">{tip.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${importanceBadge[tip.importance]}`}>
                {tip.importance === 'high' ? 'Important' : tip.importance === 'medium' ? 'Recommended' : 'Nice to have'}
              </span>
            </div>
            <p className="text-gray-300 text-sm">{tip.description}</p>
          </motion.div>
        );
      })}
    </div>
  </div>
);

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function Tutorial() {
  const [activeSection, setActiveSection] = useState('welcome');

  const currentSection = tutorialSections.find(s => s.id === activeSection);
  const currentIndex = tutorialSections.findIndex(s => s.id === activeSection);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setActiveSection(tutorialSections[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentIndex < tutorialSections.length - 1) {
      setActiveSection(tutorialSections[currentIndex + 1].id);
    }
  };

  const renderContent = () => {
    if (!currentSection) return null;

    switch (currentSection.id) {
      case 'welcome':
        return <WelcomeSection content={currentSection.content} />;
      case 'workflow':
        return <WorkflowSection content={currentSection.content} />;
      case 'add-modal':
      case 'edit-modal':
      case 'update-modal':
      case 'reconcile-modal':
      case 'import-modal':
        return <ModalSection content={currentSection.content} color={currentSection.color} />;
      case 'pages':
        return <PagesSection content={currentSection.content} />;
      case 'tips':
        return <TipsSection content={currentSection.content} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <Head>
        <title>NestEgg | Getting Started Guide</title>
        <meta name="description" content="Learn how to use NestEgg to track your complete financial picture" />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Getting Started</h1>
              <p className="text-gray-400">Learn how to use NestEgg effectively</p>
            </div>
          </div>

          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 hover:text-white transition-colors"
          >
            Go to Portfolio
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-2 bg-gray-900/30 rounded-2xl p-4 border border-gray-800/50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-3">
                Guide Sections
              </h3>
              {tutorialSections.map(section => (
                <SectionNavItem
                  key={section.id}
                  section={section}
                  isActive={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                />
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-900/30 rounded-2xl p-8 border border-gray-800/50 min-h-[600px]"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  currentIndex === 0
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {tutorialSections.map((section, i) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      activeSection === section.id
                        ? 'bg-indigo-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goToNext}
                disabled={currentIndex === tutorialSections.length - 1}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  currentIndex === tutorialSections.length - 1
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
