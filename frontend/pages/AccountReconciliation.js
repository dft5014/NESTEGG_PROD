// AccountReconciliation.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Chip, 
  CircularProgress, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider, 
  Grid, 
  IconButton, 
  Paper, 
  Stack, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  Tooltip, 
  Typography
} from '@mui/material';

import { 
  CheckCircle, 
  Warning, 
  Error,
  ArrowForward, 
  Refresh, 
  InfoOutlined, 
  CheckCircleOutline,
  HelpOutline,
  ArrowDropDown,
  MoreVert,
  AccessTime
} from '@mui/icons-material';

// Mock data for demonstration purposes - would be fetched from API in production
const MOCK_ACCOUNTS = [
  { 
    id: 1, 
    name: "Vanguard IRA", 
    type: "Retirement", 
    institutionName: "Vanguard",
    lastReconciledDate: "2023-05-01",
    currentValue: 142568.32,
    currentStatus: "needsReview", // 'reconciled', 'needsReview', 'outOfDate'
    positions: [
      { id: 101, name: "VTSAX", shares: 420.32, currentPrice: 123.45, currentValue: 51889.48, lastReconciledDate: "2023-05-01", status: "needsReview" },
      { id: 102, name: "VBTLX", shares: 320.15, currentPrice: 89.32, currentValue: 28595.80, lastReconciledDate: "2023-05-01", status: "needsReview" },
      { id: 103, name: "VTIAX", shares: 510.67, currentPrice: 112.78, currentValue: 57594.40, lastReconciledDate: "2023-05-01", status: "needsReview" },
      { id: 104, name: "Cash", shares: 1, currentPrice: 4488.64, currentValue: 4488.64, lastReconciledDate: "2023-05-01", status: "needsReview" }
    ]
  },
  { 
    id: 2, 
    name: "Fidelity 401(k)", 
    type: "Retirement", 
    institutionName: "Fidelity",
    lastReconciledDate: "2023-05-07", // Just reconciled
    currentValue: 215673.45,
    currentStatus: "reconciled",
    positions: [
      { id: 201, name: "FXAIX", shares: 320.45, currentPrice: 189.32, currentValue: 60669.64, lastReconciledDate: "2023-05-07", status: "reconciled" },
      { id: 202, name: "FSPSX", shares: 410.87, currentPrice: 132.45, currentValue: 54420.73, lastReconciledDate: "2023-05-07", status: "reconciled" },
      { id: 203, name: "FXNAX", shares: 830.55, currentPrice: 112.56, currentValue: 93486.74, lastReconciledDate: "2023-05-07", status: "reconciled" },
      { id: 204, name: "Cash", shares: 1, currentPrice: 7096.34, currentValue: 7096.34, lastReconciledDate: "2023-05-07", status: "reconciled" }
    ]
  },
  { 
    id: 3, 
    name: "Chase Brokerage", 
    type: "Taxable", 
    institutionName: "Chase",
    lastReconciledDate: "2022-09-15", // Over 6 months ago - out of date
    currentValue: 87562.12,
    currentStatus: "outOfDate",
    positions: [
      { id: 301, name: "AAPL", shares: 25, currentPrice: 178.45, currentValue: 4461.25, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 302, name: "MSFT", shares: 15, currentPrice: 332.58, currentValue: 4988.70, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 303, name: "VOO", shares: 120.32, currentPrice: 412.34, currentValue: 49612.96, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 304, name: "AMZN", shares: 18, currentPrice: 124.76, currentValue: 2245.68, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 305, name: "Cash", shares: 1, currentPrice: 26253.53, currentValue: 26253.53, lastReconciledDate: "2022-09-15", status: "outOfDate" }
    ]
  }
];

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Helper function to format dates
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Helper to determine days since last reconciliation
const daysSinceLastReconciled = (dateString) => {
  const lastDate = new Date(dateString);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper to get status details
const getStatusDetails = (status, lastReconciledDate) => {
  const days = daysSinceLastReconciled(lastReconciledDate);
  
  if (status === 'reconciled') {
    return {
      icon: <CheckCircle color="success" />,
      label: 'Reconciled',
      description: `Last reconciled ${days} days ago`,
      color: 'success'
    };
  } else if (status === 'needsReview') {
    return {
      icon: <Warning color="warning" />,
      label: 'Needs Review',
      description: `Last reconciled ${days} days ago`,
      color: 'warning'
    };
  } else {
    return {
      icon: <Error color="error" />,
      label: 'Out of Date',
      description: `Last reconciled ${days} days ago`,
      color: 'error'
    };
  }
};

const AccountReconciliation = () => {
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [enteredBalance, setEnteredBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showTips, setShowTips] = useState(true);

  // Simulating API fetch
  useEffect(() => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  const handleAccountExpand = (accountId) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
    }
  };

  const handleOpenReconcileDialog = (account) => {
    setSelectedAccount(account);
    setEnteredBalance(account.currentValue.toString());
    setReconcileDialogOpen(true);
  };

  const handleCloseReconcileDialog = () => {
    setReconcileDialogOpen(false);
    setSelectedAccount(null);
    setEnteredBalance('');
  };

  const handleBalanceChange = (e) => {
    // Allow only numbers and decimal point
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setEnteredBalance(value);
  };

  const handleReconcileAccount = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedAccounts = accounts.map(account => {
        if (account.id === selectedAccount.id) {
          const parsedBalance = parseFloat(enteredBalance);
          const difference = Math.abs(parsedBalance - account.currentValue);
          const percentDifference = (difference / account.currentValue) * 100;
          
          // If within 0.1% tolerance, consider it reconciled
          const isReconciled = percentDifference <= 0.1;
          
          const newStatus = isReconciled ? 'reconciled' : 'needsReview';
          const today = new Date().toISOString().split('T')[0];
          
          return {
            ...account,
            currentValue: parsedBalance,
            currentStatus: newStatus,
            lastReconciledDate: today,
            positions: isReconciled ? 
              account.positions.map(position => ({
                ...position,
                status: 'reconciled',
                lastReconciledDate: today
              })) :
              account.positions
          };
        }
        return account;
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      setReconcileDialogOpen(false);
      
      // Show success message
      const reconciled = updatedAccounts.find(a => a.id === selectedAccount.id);
      setSuccessMessage(
        reconciled.currentStatus === 'reconciled' 
          ? `${reconciled.name} successfully reconciled! All positions are now up to date.` 
          : `${reconciled.name} balance updated, but there may be discrepancies to review at the position level.`
      );
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 1000);
  };

  const handleReconcileAllPositions = (accountId) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedAccounts = accounts.map(account => {
        if (account.id === accountId) {
          const today = new Date().toISOString().split('T')[0];
          
          return {
            ...account,
            currentStatus: 'reconciled',
            lastReconciledDate: today,
            positions: account.positions.map(position => ({
              ...position,
              status: 'reconciled',
              lastReconciledDate: today
            }))
          };
        }
        return account;
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      
      // Show success message
      const reconciled = updatedAccounts.find(a => a.id === accountId);
      setSuccessMessage(`All positions in ${reconciled.name} have been marked as reconciled.`);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 1000);
  };

  const handleReconcilePosition = (accountId, positionId) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedAccounts = accounts.map(account => {
        if (account.id === accountId) {
          const today = new Date().toISOString().split('T')[0];
          
          const updatedPositions = account.positions.map(position => {
            if (position.id === positionId) {
              return {
                ...position,
                status: 'reconciled',
                lastReconciledDate: today
              };
            }
            return position;
          });
          
          // Check if all positions are now reconciled
          const allReconciled = updatedPositions.every(p => p.status === 'reconciled');
          
          return {
            ...account,
            currentStatus: allReconciled ? 'reconciled' : account.currentStatus,
            lastReconciledDate: allReconciled ? today : account.lastReconciledDate,
            positions: updatedPositions
          };
        }
        return account;
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      
      // Show success message
      const position = updatedAccounts
        .find(a => a.id === accountId)
        .positions
        .find(p => p.id === positionId);
        
      setSuccessMessage(`${position.name} position has been reconciled.`);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 800);
  };

  const handleReconcileAllUnreconciled = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      
      const updatedAccounts = accounts.map(account => {
        return {
          ...account,
          currentStatus: 'reconciled',
          lastReconciledDate: today,
          positions: account.positions.map(position => ({
            ...position,
            status: 'reconciled',
            lastReconciledDate: today
          }))
        };
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      setSuccessMessage('All accounts and positions have been marked as reconciled.');
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 1500);
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 500 }}>
          Account Reconciliation
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<HelpOutline />}
            onClick={() => setShowTips(!showTips)}
            sx={{ mr: 2 }}
          >
            {showTips ? 'Hide Tips' : 'Show Tips'}
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<CheckCircleOutline />}
            onClick={handleReconcileAllUnreconciled}
          >
            Reconcile All Positions
          </Button>
        </Box>
      </Box>

      {showTips && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: 'rgba(232, 244, 253, 0.8)',
            borderRadius: 2,
            border: '1px solid rgba(25, 118, 210, 0.12)'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <InfoOutlined color="primary" sx={{ mt: 0.5 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Reconciliation Tips
              </Typography>
              <Typography variant="body2" paragraph>
                Regular reconciliation ensures your NestEgg data accurately reflects your actual financial accounts.
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    When to Reconcile
                  </Typography>
                  <Typography variant="body2">
                    • After any transactions occur<br />
                    • At month-end<br />
                    • After major purchases or sales
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Reconciliation Process
                  </Typography>
                  <Typography variant="body2">
                    1. Enter your actual account balance<br />
                    2. Verify each position is correct<br />
                    3. Mark all positions as reconciled
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Data Integrity
                  </Typography>
                  <Typography variant="body2">
                    Reconciled accounts display a reliability indicator in reports and dashboards to show data confidence.
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Paper>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {successMessage && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'rgba(237, 247, 237, 0.9)',
            borderRadius: 2,
            border: '1px solid rgba(46, 125, 50, 0.2)'
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CheckCircle color="success" />
            <Typography>{successMessage}</Typography>
          </Stack>
        </Paper>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Your Accounts
        </Typography>
        <Divider />
      </Box>

      <Stack spacing={3}>
        {accounts.map((account) => {
          const statusDetails = getStatusDetails(account.currentStatus, account.lastReconciledDate);
          const isExpanded = expandedAccount === account.id;
          
          return (
            <Card 
              key={account.id} 
              elevation={1}
              sx={{ 
                borderRadius: 2,
                borderLeft: 4,
                borderColor: `${statusDetails.color}.main`,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 3
                }
              }}
            >
              <CardContent sx={{ px: 3, py: 2 }}>
                <Grid container alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {statusDetails.icon}
                      <Box>
                        <Typography variant="h6" component="div">
                          {account.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.institutionName} • {account.type}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={12} md={3} sx={{ mt: { xs: 2, md: 0 } }}>
                    <Typography variant="body2" color="text.secondary">
                      Current Value
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(account.currentValue)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={3} sx={{ mt: { xs: 2, md: 0 } }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip 
                        icon={<AccessTime sx={{ fontSize: '1rem !important' }} />}
                        label={`Last: ${formatDate(account.lastReconciledDate)}`}
                        size="small"
                        sx={{ 
                          height: 26, 
                          backgroundColor: 'background.paper',
                          border: 1,
                          borderColor: 'divider'
                        }}
                      />
                      
                      <Tooltip title={statusDetails.description}>
                        <Chip 
                          icon={statusDetails.icon}
                          label={statusDetails.label}
                          size="small"
                          color={statusDetails.color}
                          sx={{ height: 26 }}
                        />
                      </Tooltip>
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={12} md={2} sx={{ mt: { xs: 2, md: 0 } }}>
                    <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleAccountExpand(account.id)}
                        endIcon={<ArrowDropDown />}
                        size="small"
                      >
                        {isExpanded ? 'Hide' : 'View'} Positions
                      </Button>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleOpenReconcileDialog(account)}
                        size="small"
                      >
                        Reconcile
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
                
                {isExpanded && (
                  <Box sx={{ mt: 3, mb: 1 }}>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">
                        Positions
                      </Typography>
                      
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CheckCircleOutline />}
                        onClick={() => handleReconcileAllPositions(account.id)}
                        disabled={account.currentStatus === 'reconciled'}
                      >
                        Mark All Positions as Reconciled
                      </Button>
                    </Stack>
                    
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Position</TableCell>
                            <TableCell align="right">Shares</TableCell>
                            <TableCell align="right">Current Price</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell>Last Reconciled</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {account.positions.map((position) => {
                            const posStatusDetails = getStatusDetails(position.status, position.lastReconciledDate);
                            
                            return (
                              <TableRow 
                                key={position.id}
                                sx={{ 
                                  '&:last-child td, &:last-child th': { border: 0 },
                                  backgroundColor: position.status === 'reconciled' ? 'rgba(237, 247, 237, 0.3)' : 'inherit'
                                }}
                              >
                                <TableCell>{position.name}</TableCell>
                                <TableCell align="right">{position.shares.toFixed(2)}</TableCell>
                                <TableCell align="right">{formatCurrency(position.currentPrice)}</TableCell>
                                <TableCell align="right">{formatCurrency(position.currentValue)}</TableCell>
                                <TableCell>{formatDate(position.lastReconciledDate)}</TableCell>
                                <TableCell>
                                  <Chip 
                                    icon={posStatusDetails.icon}
                                    label={posStatusDetails.label}
                                    size="small"
                                    color={posStatusDetails.color}
                                    sx={{ height: 24 }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => handleReconcilePosition(account.id, position.id)}
                                    disabled={position.status === 'reconciled'}
                                  >
                                    Reconcile
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Account Reconciliation Dialog */}
      <Dialog 
        open={reconcileDialogOpen} 
        onClose={handleCloseReconcileDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reconcile {selectedAccount?.name}
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText paragraph sx={{ mb: 3 }}>
            Enter the current balance from your {selectedAccount?.institutionName} statement to reconcile your account.
          </DialogContentText>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Current Value in NestEgg
              </Typography>
              <Typography variant="h5">
                {selectedAccount && formatCurrency(selectedAccount.currentValue)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Actual Value from Statement"
                variant="outlined"
                fullWidth
                value={enteredBalance}
                onChange={handleBalanceChange}
                InputProps={{
                  startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>$</Box>,
                }}
                autoFocus
              />
            </Grid>
          </Grid>
          
          {selectedAccount && enteredBalance && (
            <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(232, 244, 253, 0.5)', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Reconciliation Preview
              </Typography>
              
              {(() => {
                try {
                  const parsedBalance = parseFloat(enteredBalance);
                  const difference = parsedBalance - selectedAccount.currentValue;
                  const percentDifference = (Math.abs(difference) / selectedAccount.currentValue) * 100;
                  
                  const isWithinTolerance = percentDifference <= 0.1;
                  
                  return (
                    <>
                      <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            Difference
                          </Typography>
                          <Typography variant="body1" color={difference === 0 ? 'success.main' : 'warning.main'}>
                            {formatCurrency(difference)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            % Difference
                          </Typography>
                          <Typography variant="body1" color={isWithinTolerance ? 'success.main' : 'warning.main'}>
                            {percentDifference.toFixed(2)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            Status
                          </Typography>
                          <Typography variant="body1" color={isWithinTolerance ? 'success.main' : 'warning.main'}>
                            {isWithinTolerance ? 'Will reconcile' : 'Review needed'}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      {!isWithinTolerance && (
                        <Typography variant="body2" sx={{ mt: 1.5, color: 'warning.dark' }}>
                          Difference exceeds 0.1% threshold. After updating, you may need to review individual positions.
                        </Typography>
                      )}
                    </>
                  );
                } catch (e) {
                  return (
                    <Typography variant="body2" color="error">
                      Please enter a valid number
                    </Typography>
                  );
                }
              })()}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseReconcileDialog}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleReconcileAccount}
            disabled={!enteredBalance || isNaN(parseFloat(enteredBalance))}
          >
            Update & Reconcile
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountReconciliation;