import { useState } from 'react';
import { PlusCircle, DollarSign, Calendar, Users, Edit, TrendingUp, Wallet, Target, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';


// Types
interface Deal {
  id: string;
  name: string;
  size: number;
  rate: number;
  term: number;
}

interface Payment {
  date: string;
  amount: number;
  status: 'pending' | 'paid' | 'missed' | 'modified';
  originalAmount?: number;
  modificationNote?: string;
}

interface Syndication {
  [key: string]: { [key: string]: number };
}

function App() {
  const [users, setUsers] = useState<string[]>(['albert', 'jacobo', 'matty', 'joel', 'zack', 'juli']);
  const [deals, setDeals] = useState<Deal[]>([
    { id: 'D101', name: 'Green Cafe', size: 30000, rate: 1.49, term: 30 },
    { id: 'D102', name: 'FastFit Gym', size: 50000, rate: 1.45, term: 60 },
    { id: 'D103', name: 'TechNova Labs', size: 100000, rate: 1.5, term: 90 },
  ]);
  const [syndications, setSyndications] = useState<Syndication>({
    D101: { albert: 40, jacobo: 60 },
    D102: { matty: 30, joel: 30, zack: 40 },
    D103: { juli: 50, jacobo: 50 },
  });
  const [payments, setPayments] = useState<{ [key: string]: Payment[] }>({});
  const [newUser, setNewUser] = useState('');
  const [newDeal, setNewDeal] = useState<Partial<Deal>>({});
  const [selectedDeal, setSelectedDeal] = useState<string>('');
  const [syndicationPercentages, setSyndicationPercentages] = useState<{ [key: string]: number }>({});
  const [selectedPayment, setSelectedPayment] = useState<{ dealId: string; index: number } | null>(null);
  const [modifiedAmount, setModifiedAmount] = useState<number>(0);
  const [modificationNote, setModificationNote] = useState<string>('');
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  // Initialize payments
  const initializePayments = (deal: Deal) => {
    const dailyPayment = Math.round((deal.size * deal.rate) / deal.term * 100) / 100;
    const paymentSchedule = Array.from({ length: deal.term }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: dailyPayment,
      status: 'pending' as const,
    }));
    setPayments(prev => ({ ...prev, [deal.id]: paymentSchedule }));
  };

  // Initialize payments for existing deals
  useState(() => {
    deals.forEach(deal => {
      if (!payments[deal.id]) {
        initializePayments(deal);
      }
    });
  });

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const totalDeals = deals.reduce((sum, deal) => sum + deal.size, 0);
    const totalToBeCollected = deals.reduce((sum, deal) => sum + (deal.size * deal.rate), 0);
    const totalCollected = Object.entries(payments).reduce((sum, [dealId, paymentList]) => {
      return sum + paymentList.filter(p => p.status === 'paid').reduce((pSum, p) => pSum + p.amount, 0);
    }, 0);
    const missedPayments = Object.values(payments).flat().filter(p => p.status === 'missed').length;

    return {
      totalDeals,
      totalToBeCollected,
      totalCollected,
      missedPayments,
    };
  };

  // Calculate payment progress for a deal
  const calculateProgress = (dealId: string) => {
    const dealPayments = payments[dealId] || [];
    const paidCount = dealPayments.filter(p => p.status === 'paid').length;
    return (paidCount / dealPayments.length) * 100;
  };

  // Add new user
  const handleAddUser = () => {
    if (newUser && !users.includes(newUser.toLowerCase())) {
      setUsers([...users, newUser.toLowerCase()]);
      setNewUser('');
    }
  };

  // Add new deal
  const handleAddDeal = () => {
    if (newDeal.name && newDeal.size && newDeal.rate && newDeal.term) {
      const deal = {
        ...newDeal,
        id: `D${100 + deals.length + 1}`,
      } as Deal;
      setDeals([...deals, deal]);
      initializePayments(deal);
      setNewDeal({});
    }
  };

  // Assign syndication
  const handleAssignSyndication = () => {
    if (selectedDeal) {
      const totalPercentage = Object.values(syndicationPercentages).reduce((a, b) => a + b, 0);
      if (totalPercentage === 100) {
        setSyndications({
          ...syndications,
          [selectedDeal]: { ...syndicationPercentages },
        });
      }
    }
  };

  // Update payment status
  const handlePaymentUpdate = (dealId: string, dayIndex: number, status: Payment['status']) => {
    const updatedPayments = [...payments[dealId]];
    updatedPayments[dayIndex] = { ...updatedPayments[dayIndex], status };
    setPayments({ ...payments, [dealId]: updatedPayments });
  };

  // Modify payment
  const handleModifyPayment = () => {
    if (selectedPayment && modifiedAmount > 0) {
      const { dealId, index } = selectedPayment;
      const updatedPayments = [...payments[dealId]];
      const originalPayment = updatedPayments[index];
      
      updatedPayments[index] = {
        ...originalPayment,
        status: 'modified',
        originalAmount: originalPayment.amount,
        amount: modifiedAmount,
        modificationNote,
      };
      
      setPayments({ ...payments, [dealId]: updatedPayments });
      setSelectedPayment(null);
      setModifiedAmount(0);
      setModificationNote('');
    }
  };

  const metrics = calculateMetrics();

  // Generate chart data
  const generateDailyCollectionData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(date => ({
      date,
      collected: Object.values(payments)
        .flat()
        .filter(p => p.date === date && p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">MCA Tracker</h1>
          <div className="flex gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUser}
                      onChange={(e) => setNewUser(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <Button onClick={handleAddUser}>Add User</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <DollarSign className="mr-2 h-4 w-4" />
                  New Deal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Deal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business">Business Name</Label>
                    <Input
                      id="business"
                      value={newDeal.name || ''}
                      onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                      placeholder="Enter business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size">Deal Size ($)</Label>
                    <Input
                      id="size"
                      type="number"
                      value={newDeal.size || ''}
                      onChange={(e) => setNewDeal({ ...newDeal, size: Number(e.target.value) })}
                      placeholder="Enter deal size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      value={newDeal.rate || ''}
                      onChange={(e) => setNewDeal({ ...newDeal, rate: Number(e.target.value) })}
                      placeholder="Enter rate (e.g., 1.45)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="term">Term (days)</Label>
                    <Input
                      id="term"
                      type="number"
                      value={newDeal.term || ''}
                      onChange={(e) => setNewDeal({ ...newDeal, term: Number(e.target.value) })}
                      placeholder="Enter term length"
                    />
                  </div>
                  <Button onClick={handleAddDeal}>Add Deal</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="deals">Active Deals</TabsTrigger>
            <TabsTrigger value="syndications">Syndications</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Active Deals</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalDeals.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total to be Collected</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalToBeCollected.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalCollected.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Missed Payments</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.missedPayments}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Collections</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={generateDailyCollectionData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="collected" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Deal Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deals.map(deal => ({
                          name: deal.name,
                          value: deal.size
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {deals.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            {deals.map((deal) => (
              <Card key={deal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{deal.name}</CardTitle>
                      <CardDescription>
                        Deal ID: {deal.id} | Size: ${deal.size.toLocaleString()} | Rate: {deal.rate} | Term: {deal.term} days
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedDeal(deal.id)}>
                            View Syndication
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Deal Syndication - {deal.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {syndications[deal.id] && Object.entries(syndications[deal.id]).map(([user, percentage]) => (
                              <div key={user} className="flex justify-between items-center">
                                <span className="font-medium capitalize">{user}</span>
                                <span>{percentage}% (${((deal.size * percentage) / 100).toLocaleString()})</span>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}
                      >
                        {expandedDeal === deal.id ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span>{Math.round(calculateProgress(deal.id))}%</span>
                    </div>
                    <Progress value={calculateProgress(deal.id)} className="h-2" />
                  </div>
                </CardHeader>
                {expandedDeal === deal.id && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {payments[deal.id]?.map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded">
                          <div>
                            <div className="font-medium">Day {index + 1}</div>
                            <div className="text-sm text-muted-foreground">
                              {payment.date}
                            </div>
                            <div className="text-sm font-medium">
                              ${payment.amount}
                              {payment.originalAmount && (
                                <span className="text-muted-foreground ml-2">
                                  (Original: ${payment.originalAmount})
                                </span>
                              )}
                            </div>
                            {payment.modificationNote && (
                              <div className="text-sm text-muted-foreground">
                                Note: {payment.modificationNote}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Select
                              value={payment.status}
                              onValueChange={(value: Payment['status']) => 
                                handlePaymentUpdate(deal.id, index, value)
                              }
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="missed">Missed</SelectItem>
                                <SelectItem value="modified">Modified</SelectItem>
                              </SelectContent>
                            </Select>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPayment({ dealId: deal.id, index });
                                    setModifiedAmount(payment.amount);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modify
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modify Payment</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>New Amount ($)</Label>
                                    <Input
                                      type="number"
                                      value={modifiedAmount}
                                      onChange={(e) => setModifiedAmount(Number(e.target.value))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Modification Note</Label>
                                    <Input
                                      value={modificationNote}
                                      onChange={(e) => setModificationNote(e.target.value)}
                                      placeholder="Reason for modification"
                                    />
                                  </div>
                                  <Button onClick={handleModifyPayment}>Save Changes</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="syndications">
            <Card>
              <CardHeader>
                <CardTitle>Manage Syndications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Deal</Label>
                    <Select value={selectedDeal} onValueChange={setSelectedDeal}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a deal" />
                      </SelectTrigger>
                      <SelectContent>
                        {deals.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.name} ({deal.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDeal && (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user} className="space-y-2">
                          <Label>{user}</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={syndicationPercentages[user] || 0}
                            onChange={(e) =>
                              setSyndicationPercentages({
                                ...syndicationPercentages,
                                [user]: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      ))}
                      <Button onClick={handleAssignSyndication}>Assign Syndication</Button>
                    </div>
                  )}

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Current Syndications</h3>
                    {Object.entries(syndications).map(([dealId, userShares]) => (
                      <div key={dealId} className="mb-4">
                        <h4 className="font-medium">
                          {deals.find((d) => d.id === dealId)?.name} ({dealId})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(userShares).map(([user, percentage]) => (
                            <div key={user} className="text-sm">
                              {user}: {percentage}%
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
