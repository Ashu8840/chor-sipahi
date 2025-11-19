import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, AlertTriangle, BarChart3 } from "lucide-react";
import Navbar from "../components/Navbar";
import Loading from "../components/Loading";
import { adminAPI } from "../services/api";
import toast from "react-hot-toast";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats");

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "reports") fetchReports();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      toast.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers();
      setUsers(response.data.users);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const fetchReports = async () => {
    try {
      const response = await adminAPI.getAllReports({ status: "pending" });
      setReports(response.data.reports);
    } catch (error) {
      toast.error("Failed to fetch reports");
    }
  };

  const handleBanUser = async (userId) => {
    if (!confirm("Are you sure you want to ban this user?")) return;

    try {
      await adminAPI.banUser(userId);
      toast.success("User banned successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await adminAPI.unbanUser(userId);
      toast.success("User unbanned successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to unban user");
    }
  };

  const handleResolveReport = async (reportId, status) => {
    try {
      await adminAPI.updateReport(reportId, { status });
      toast.success(`Report ${status}`);
      fetchReports();
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-10 h-10 text-primary-500" />
            <h1 className="text-4xl font-bold gradient-text">Admin Panel</h1>
          </div>

          <div className="flex space-x-2 border-b border-gray-800">
            {[
              { id: "stats", label: "Dashboard", icon: BarChart3 },
              { id: "users", label: "Users", icon: Users },
              { id: "reports", label: "Reports", icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-primary-500 border-b-2 border-primary-500"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  label="Total Users"
                  value={stats.totalUsers}
                  icon={<Users />}
                />
                <StatCard
                  label="Banned Users"
                  value={stats.bannedUsers}
                  icon={<Shield />}
                  color="red"
                />
                <StatCard
                  label="Total Matches"
                  value={stats.totalMatches}
                  icon={<BarChart3 />}
                />
                <StatCard
                  label="Active Rooms"
                  value={stats.activeRooms}
                  icon={<Users />}
                  color="green"
                />
              </div>

              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Recent Users</h2>
                <div className="space-y-2">
                  {stats.recentUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <span className="font-semibold">{user.username}</span>
                      <span className="text-sm text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">User Management</h2>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{user.username}</div>
                        <div className="text-sm text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {user.isBanned && (
                        <span className="badge bg-red-600 text-white">
                          Banned
                        </span>
                      )}
                      {user.isAdmin && (
                        <span className="badge bg-yellow-600 text-white">
                          Admin
                        </span>
                      )}

                      {!user.isAdmin && (
                        <button
                          onClick={() =>
                            user.isBanned
                              ? handleUnbanUser(user._id)
                              : handleBanUser(user._id)
                          }
                          className={`btn-${
                            user.isBanned ? "secondary" : "primary"
                          } text-sm`}
                        >
                          {user.isBanned ? "Unban" : "Ban"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Pending Reports</h2>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No pending reports
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report._id}
                      className="p-4 bg-gray-800 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">
                            {report.reporter.username}
                          </span>
                          <span className="text-gray-400"> reported </span>
                          <span className="font-semibold">
                            {report.reportedUser.username}
                          </span>
                        </div>
                        <span className="badge bg-yellow-600">
                          {report.reason}
                        </span>
                      </div>

                      {report.description && (
                        <p className="text-sm text-gray-400 italic">
                          "{report.description}"
                        </p>
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleResolveReport(report._id, "resolved")
                          }
                          className="btn-primary text-sm"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() =>
                            handleResolveReport(report._id, "dismissed")
                          }
                          className="btn-secondary text-sm"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = "primary" }) {
  const colors = {
    primary: "text-primary-500",
    red: "text-red-500",
    green: "text-green-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card text-center space-y-3"
    >
      <div className={`flex justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-gray-400 text-sm">{label}</div>
      </div>
    </motion.div>
  );
}
