import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Activity,
  Phone,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface QueueItem {
  id: string;
  mrnNumber: string;
  firstName_ar?: string;
  secondName_ar?: string;
  thirdName_ar?: string;
  fourthName_ar?: string;
  firstName_en?: string;
  secondName_en?: string;
  thirdName_en?: string;
  fourthName_en?: string;
  fullName?: string;
  phone?: string;
  accessionNumber: string;
  examType: string;
  status: "scheduled" | "checked_in" | "in_progress" | "completed";
  priority: "normal" | "urgent" | "emergency";
  checkedInTime?: string;
  createdAt?: string;
  position?: number;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string; labelAr: string }> = {
  scheduled: {
    icon: Calendar,
    color: "bg-blue-100 text-blue-800",
    label: "Scheduled",
    labelAr: "مجدول",
  },
  checked_in: {
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800",
    label: "Checked In",
    labelAr: "حاضر",
  },
  in_progress: {
    icon: Activity,
    color: "bg-purple-100 text-purple-800",
    label: "In Progress",
    labelAr: "قيد المعالجة",
  },
  completed: {
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-800",
    label: "Completed",
    labelAr: "مكتمل",
  },
};

const PRIORITY_CONFIG: Record<string, { icon: any; color: string; label: string; labelAr: string }> = {
  normal: {
    icon: Clock,
    color: "bg-gray-100 text-gray-800",
    label: "Normal",
    labelAr: "عادي",
  },
  urgent: {
    icon: AlertCircle,
    color: "bg-orange-100 text-orange-800",
    label: "Urgent",
    labelAr: "مستعجل",
  },
  emergency: {
    icon: AlertCircle,
    color: "bg-red-100 text-red-800",
    label: "Emergency",
    labelAr: "حالة طوارئ",
  },
};

export default function PatientWaitingList() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"time" | "priority" | "name">("time");

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
  });

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try local API first
      const response = await fetch("/api/patients/queue", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch queue");
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.data || [];

      // Enhance items with position and calculate waiting time
      const enhancedItems = items.map((item: any, index: number) => ({
        ...item,
        position: index + 1,
        fullName: item.fullName || 
          [item.firstName_ar, item.secondName_ar, item.thirdName_ar, item.fourthName_ar]
            .filter(Boolean)
            .join(" ") ||
          [item.firstName_en, item.secondName_en, item.thirdName_en, item.fourthName_en]
            .filter(Boolean)
            .join(" ") ||
          item.patientName ||
          "Unknown",
      }));

      setQueueItems(enhancedItems);

      // Calculate statistics
      const total = enhancedItems.length;
      const waiting = enhancedItems.filter(
        (item) => item.status === "scheduled" || item.status === "checked_in"
      ).length;
      const inProgress = enhancedItems.filter(
        (item) => item.status === "in_progress"
      ).length;
      const completed = enhancedItems.filter(
        (item) => item.status === "completed"
      ).length;

      setStats({ total, waiting, inProgress, completed });
    } catch (err) {
      console.error("Error fetching queue:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch queue data");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortQueue = () => {
    let filtered = [...queueItems];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const name = (item.fullName || "").toLowerCase();
        const mrn = (item.mrnNumber || "").toLowerCase();
        const accession = (item.accessionNumber || "").toLowerCase();
        const phone = (item.phone || "").toLowerCase();
        return (
          name.includes(query) ||
          mrn.includes(query) ||
          accession.includes(query) ||
          phone.includes(query)
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((item) => item.priority === priorityFilter);
    }

    // Sorting
    if (sortBy === "time") {
      filtered.sort((a, b) => {
        const aTime = new Date(a.checkedInTime || a.createdAt || 0).getTime();
        const bTime = new Date(b.checkedInTime || b.createdAt || 0).getTime();
        return aTime - bTime;
      });
    } else if (sortBy === "priority") {
      const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
      filtered.sort(
        (a, b) =>
          (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
      );
    } else if (sortBy === "name") {
      filtered.sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || "")
      );
    }

    // Re-add position numbers
    const positioned = filtered.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setFilteredItems(positioned);
  };

  const calculateWaitingTime = (dateString?: string): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days}d`;
    }
  };

  const updateStatus = async (itemId: string, newStatus: string) => {
    try {
      // Update locally first
      setQueueItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: newStatus as any } : item
        )
      );

      // Try to update in backend
      await fetch("/api/patients/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examOrderId: itemId,
          status: newStatus,
        }),
      }).catch(() => console.log("Backend update failed, continuing with local state"));

      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent("examStatusUpdated", {
          detail: { itemId, status: newStatus },
        })
      );

      // Refresh queue
      setTimeout(() => fetchQueue(), 500);
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Fetch queue on mount
  useEffect(() => {
    fetchQueue();

    // Set up auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchQueue();
    }, 5000);

    // Listen for exam status updates from other components
    const handleStatusUpdate = (event: Event) => {
      console.log("Waiting list received status update event", event);
      fetchQueue();
    };

    window.addEventListener("examStatusUpdated", handleStatusUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("examStatusUpdated", handleStatusUpdate);
    };
  }, []);

  // Filter and sort when dependencies change
  useEffect(() => {
    filterAndSortQueue();
  }, [queueItems, searchQuery, statusFilter, priorityFilter, sortBy]);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {language === "ar" ? "قائمة انتظار المرضى" : "Patient Waiting List"}
        </h1>
        <p className="text-muted-foreground">
          {language === "ar"
            ? "إدارة وتتبع المرضى في قائمة الانتظار"
            : "Manage and track patients in the waiting queue"}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "ar" ? "الإجمالي" : "Total"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "ar" ? "بانتظار" : "Waiting"}
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.waiting}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "ar" ? "قيد المعالجة" : "In Progress"}
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === "ar" ? "مكتمل" : "Completed"}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "بحث وتصفية" : "Search & Filter"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Input
              placeholder={language === "ar" ? "ابحث بالاسم أو المرن أو الهاتف" : "Search by name, MRN, phone..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-span-1"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={language === "ar" ? "جميع الحالات" : "All Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "ar" ? "جميع الحالات" : "All Status"}
                </SelectItem>
                <SelectItem value="scheduled">
                  {language === "ar" ? "مجدول" : "Scheduled"}
                </SelectItem>
                <SelectItem value="checked_in">
                  {language === "ar" ? "حاضر" : "Checked In"}
                </SelectItem>
                <SelectItem value="in_progress">
                  {language === "ar" ? "قيد المعالجة" : "In Progress"}
                </SelectItem>
                <SelectItem value="completed">
                  {language === "ar" ? "مكتمل" : "Completed"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder={language === "ar" ? "جميع الأولويات" : "All Priority"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "ar" ? "جميع الأولويات" : "All Priority"}
                </SelectItem>
                <SelectItem value="normal">
                  {language === "ar" ? "عادي" : "Normal"}
                </SelectItem>
                <SelectItem value="urgent">
                  {language === "ar" ? "مستعجل" : "Urgent"}
                </SelectItem>
                <SelectItem value="emergency">
                  {language === "ar" ? "حالة طوارئ" : "Emergency"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger>
                <SelectValue placeholder={language === "ar" ? "ترتيب بـ" : "Sort by"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">
                  {language === "ar" ? "الوقت" : "Time"}
                </SelectItem>
                <SelectItem value="priority">
                  {language === "ar" ? "الأولوية" : "Priority"}
                </SelectItem>
                <SelectItem value="name">
                  {language === "ar" ? "الاسم" : "Name"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={fetchQueue}
              variant="outline"
              size="icon"
              className="w-full"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "قائمة المرضى" : "Patient Queue"}
          </CardTitle>
          <CardDescription>
            {filteredItems.length} {language === "ar" ? "مريض" : "patients"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">
                {language === "ar" ? "جاري التحميل..." : "Loading..."}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-800">
              {language === "ar" ? "خطأ: " : "Error: "}{error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">
                {language === "ar" ? "لا توجد مرضى" : "No patients"}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      {language === "ar" ? "#" : "#"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "الاسم" : "Name"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "رقم المريض" : "MRN"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "رقم الطلب" : "Accession #"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "نوع الفحص" : "Exam Type"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "الحالة" : "Status"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "الأولوية" : "Priority"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "وقت الانتظار" : "Wait Time"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "الهاتف" : "Phone"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "الوقت" : "Time"}
                    </TableHead>
                    <TableHead>
                      {language === "ar" ? "الإجراء" : "Action"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const statusConfig = STATUS_CONFIG[item.status];
                    const priorityConfig = PRIORITY_CONFIG[item.priority];
                    const StatusIcon = statusConfig.icon;
                    const PriorityIcon = priorityConfig.icon;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.position}</TableCell>
                        <TableCell className="font-medium">{item.fullName}</TableCell>
                        <TableCell className="text-sm">{item.mrnNumber}</TableCell>
                        <TableCell className="text-sm">{item.accessionNumber}</TableCell>
                        <TableCell className="text-sm">{item.examType}</TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.color} cursor-pointer`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {language === "ar"
                              ? statusConfig.labelAr
                              : statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${priorityConfig.color}`}>
                            <PriorityIcon className="mr-1 h-3 w-3" />
                            {language === "ar"
                              ? priorityConfig.labelAr
                              : priorityConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {calculateWaitingTime(
                            item.checkedInTime || item.createdAt
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.phone ? (
                            <a
                              href={`tel:${item.phone}`}
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {item.phone}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(item.checkedInTime || item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.status}
                            onValueChange={(newStatus) =>
                              updateStatus(item.id, newStatus)
                            }
                          >
                            <SelectTrigger className="h-8 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">
                                {language === "ar" ? "مجدول" : "Scheduled"}
                              </SelectItem>
                              <SelectItem value="checked_in">
                                {language === "ar" ? "حاضر" : "Checked In"}
                              </SelectItem>
                              <SelectItem value="in_progress">
                                {language === "ar" ? "قيد المعالجة" : "In Progress"}
                              </SelectItem>
                              <SelectItem value="completed">
                                {language === "ar" ? "مكتمل" : "Completed"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper import for Users icon
import { Users } from "lucide-react";
