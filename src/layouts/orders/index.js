import { useState, useEffect } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDTypography from "components/MDTypography";
import DataTable from "examples/Tables/DataTable";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";

import { getOrders, initSocket } from "../../services/orderService";
import { getPaymentByOrderId } from "../../services/paymentService";
import ordersDialog from "./data/style";
import menuItem from "examples/Items/NotificationItem/styles";

function resolveOrderId(order) {
  return order?.id || order?.order_id || order?.orderId || null;
}

function normalizeOrder(order) {
  return {
    ...order,
    id: resolveOrderId(order),
    status: order?.status || order?.orderStatus || "-",
    total_amount: order?.total_amount ?? order?.totalAmount ?? order?.amount ?? 0,
    created_at: order?.created_at || order?.createdAt || null,
    items: Array.isArray(order?.items) ? order.items : [],
  };
}

function resolvePaymentStatus(payload) {
  return (
    payload?.status ||
    payload?.payment?.status ||
    payload?.data?.status ||
    payload?.paymentStatus ||
    payload?.payment_status ||
    null
  );
}

function Orders() {
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rows, setRows] = useState([]);

  const handleOpen = async (rawOrder) => {
    const order = normalizeOrder(rawOrder);

    setSelectedOrder({ ...order, paymentStatus: "Loading..." });
    setOpen(true);

    if (!order.id) {
      setSelectedOrder((previous) =>
        previous ? { ...previous, paymentStatus: "Unavailable" } : previous
      );
      return;
    }

    try {
      const paymentDetails = await getPaymentByOrderId(order.id);
      const paymentStatus = resolvePaymentStatus(paymentDetails);

      setSelectedOrder((previous) =>
        previous ? { ...previous, paymentStatus: paymentStatus || "Unavailable" } : previous
      );
    } catch (error) {
      const fallbackStatus = error?.response?.status === 404 ? "Not Found" : "Unavailable";
      setSelectedOrder((previous) =>
        previous ? { ...previous, paymentStatus: fallbackStatus } : previous
      );
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedOrder(null);
  };

  const formatOrderRow = (rawOrder) => {
    const order = normalizeOrder(rawOrder);

    return {
      id: order.id || "-",
      status: order.status,
      total: order.total_amount,
      created: order.created_at ? new Date(order.created_at).toLocaleString() : "-",
      action: (
        <MDTypography
          component="a"
          href="#"
          variant="caption"
          color="info"
          fontWeight="medium"
          onClick={() => handleOpen(order)}
          sx={{ cursor: "pointer" }}
        >
          View
        </MDTypography>
      ),
    };
  };

  useEffect(() => {
    getOrders().then((data) => {
      setRows(data.map(formatOrderRow));
    });

    const socket = initSocket();
    socket.on("order_created", (newOrder) => {
      setRows((previous) => [formatOrderRow(newOrder), ...previous]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const columns = [
    { Header: "Order ID", accessor: "id", align: "left" },
    { Header: "Status", accessor: "status", align: "center" },
    { Header: "Total Amount", accessor: "total", align: "center" },
    { Header: "Created At", accessor: "created", align: "center" },
    { Header: "Action", accessor: "action", align: "center" },
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  Orders
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <DataTable
                  table={{ columns, rows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                  sx={(theme) => ordersDialog(theme)}
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      <MenuItem sx={(theme) => menuItem(theme)}>
        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>Order Details</DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <>
                <MDTypography variant="body1" color="secondary">
                  <strong>ID:</strong> {selectedOrder.id}
                </MDTypography>
                <MDTypography variant="body1" color="secondary">
                  <strong>Status:</strong> {selectedOrder.status}
                </MDTypography>
                <MDTypography variant="body1" color="secondary">
                  <strong>Total:</strong> {selectedOrder.total_amount}
                </MDTypography>
                <MDTypography variant="body1" color="secondary">
                  <strong>Created:</strong>{" "}
                  {selectedOrder.created_at
                    ? new Date(selectedOrder.created_at).toLocaleString()
                    : "-"}
                </MDTypography>
                <MDTypography variant="body1" color="secondary">
                  <strong>Items:</strong>
                </MDTypography>
                {selectedOrder.items.map((item, idx) => (
                  <MDTypography key={idx} variant="body1" color="secondary">
                    Product {item.product_id} - Qty: {item.quantity} - Price: {item.price}
                  </MDTypography>
                ))}
                {selectedOrder.paymentStatus && (
                  <MDTypography variant="body2" color="info" sx={{ mt: 2 }}>
                    <strong>Payment Status:</strong> {selectedOrder.paymentStatus}
                  </MDTypography>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </MenuItem>
    </DashboardLayout>
  );
}

export default Orders;
