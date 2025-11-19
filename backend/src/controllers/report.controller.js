import Report from "../models/Report.model.js";
import logger from "../config/logger.js";

export const createReport = async (req, res) => {
  try {
    const { reportedUserId, reason, description } = req.body;

    if (reportedUserId === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot report yourself",
      });
    }

    const existingReport = await Report.findOne({
      reporter: req.userId,
      reportedUser: reportedUserId,
      status: "pending",
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending report for this user",
      });
    }

    const report = new Report({
      reporter: req.userId,
      reportedUser: reportedUserId,
      reason,
      description,
    });

    await report.save();

    logger.info(
      `User ${req.user.username} reported user ${reportedUserId} for ${reason}`
    );

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report: {
        _id: report._id,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    logger.error("Create report error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating report",
      error: error.message,
    });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ reporter: req.userId })
      .populate("reportedUser", "username displayName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments({ reporter: req.userId });

    res.json({
      success: true,
      reports: reports.map((report) => ({
        _id: report._id,
        reportedUser: report.reportedUser,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt,
        resolvedAt: report.resolvedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get my reports error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reports",
      error: error.message,
    });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate("reporter", "username displayName avatar")
      .populate("reportedUser", "username displayName avatar")
      .populate("reviewedBy", "username displayName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get all reports error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reports",
      error: error.message,
    });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    report.status = status;
    if (adminNotes) report.adminNotes = adminNotes;
    report.reviewedBy = req.userId;
    report.resolvedAt = Date.now();

    await report.save();

    logger.info(
      `Report ${reportId} updated to ${status} by admin ${req.user.username}`
    );

    res.json({
      success: true,
      message: "Report updated successfully",
      report: {
        _id: report._id,
        status: report.status,
        resolvedAt: report.resolvedAt,
      },
    });
  } catch (error) {
    logger.error("Update report status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating report",
      error: error.message,
    });
  }
};
