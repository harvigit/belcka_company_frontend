"use client";

import { Grid, Box, Typography, useTheme, Button } from "@mui/material";
import { Container, Stack } from "@mui/system";

export default function PrivacyPolicy() {

  return (
    <Box>
      <Box
        bgcolor="primary.light"
        sx={{
          paddingTop: {
            xs: "40px",
            lg: "100px",
          },
          paddingBottom: {
            xs: "40px",
            lg: "100px",
          },
        }}
      >
        <Container maxWidth="md">
          <Grid container spacing={3} justifyContent="space-between">
            <Grid
              alignItems="center"
              size={{
                xs: 12,
                lg: 6,
              }}
            >
              <Typography
                variant="h1"
                mb={3}
                lineHeight={1.4}
                fontWeight={700}
                sx={{
                  fontSize: {
                    xs: "34px",
                    sm: "48px",
                  },
                }}
              >
                Privacy Policy – Belcka ERP System
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography fontSize="14px">
                  <Box fontWeight={600} component="span">
                    Effective Date:{" "}
                  </Box>{" "}
                  3 Jul 2025.
                </Typography>
                <Typography fontSize="14px">
                  <Box fontWeight={600} component="span">
                    Last Updated:{" "}
                  </Box>{" "}
                  3 Jul 2025.
                </Typography>
              </Stack>
            </Grid>
            <Grid
              display="flex"
              alignItems="center"
              size={{
                xs: 12,
                lg: 5,
              }}
            >
              <Typography lineHeight={1.9}>
                Welcome to Belcka. We are committed to protecting your privacy
                and ensuring the security of your personal and organizational
                data. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our ERP
                platform—via mobile app or web interface—including modules for
                employee management, work tracking, timesheets, bookkeeping, and
                project management.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Box mt={3} mb={2}>
        <Grid container justifyContent="center">
          <Grid
            pr={2}
            pl={2}
            size={{
              xs: 12,
              lg: 5,
              sm: 8,
            }}
          >
            <Typography variant="h2" mb={2} lineHeight={1.4} fontWeight={700}>
              1. Information We Collect
            </Typography>
            <Typography lineHeight={1.0} mb={1}>
              We may collect the following types of information:
            </Typography>
            <Box ml={2}>
              <Typography lineHeight={1.5} fontWeight={700}>
                a. Personal Information
              </Typography>
              <Typography mb={1}>
                <li>Name, email, phone number, address</li>
                <li>Job title, employee ID, department</li>
                <li>Login credentials</li>
              </Typography>

              <Typography lineHeight={1.5} fontWeight={700}>
                b. Work and Usage Data
              </Typography>
              <Typography mb={1}>
                <li>Timesheet entries</li>
                <li>Project assignments and task status</li>
                <li>Clock-in/clock-out logs</li>
                <li>Leave and attendance records</li>
              </Typography>

              <Typography lineHeight={1.5} fontWeight={700}>
                c. Financial & Bookkeeping Data
              </Typography>
              <Typography mb={1}>
                <li>Invoice records</li>
                <li>Payment and transaction historyt</li>
                <li>Billing contacts and tax-related details</li>
              </Typography>

              <Typography lineHeight={1.5} fontWeight={700}>
                d. Device & Technical Information
              </Typography>
              <Typography mb={1}>
                <li>IP address, device ID, browser type, operating system</li>
                <li>Location data (if permission granted)</li>
                <li>Usage analytics and crash reports</li>
              </Typography>
            </Box>
            <Typography variant="h2" mb={2} lineHeight={1.4} fontWeight={700}>
              2. How We Use Your Information
            </Typography>
            <Typography lineHeight={1.0} mb={1}>
              We use the information to:
            </Typography>
            <Typography ml={2}>
              <li>Operate, manage, and maintain the Belcka ERP system</li>
              <li>Track employee productivity and time logs</li>
              <li>Manage projects and allocate tasks efficiently</li>
              <li>Maintain accurate accounting and financial reports</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve app and platform performance</li>
              <li>Comply with legal obligations</li>
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              3. Data Sharing & Disclosure
            </Typography>
            <Typography lineHeight={1.0} mb={1}>
              We do <b>not sell</b> your personal data. We may share data only
              with:
            </Typography>
            <Typography ml={2}>
              <li>
                <b>Authorized users</b> within your organization
              </li>
              <li>
                <b>Service providers</b> that help operate our system (e.g.,
                hosting, analytics)
              </li>
              <li>
                <b>Regulatory bodies</b> when required by law or to comply with
                legal process
              </li>
              <li>
                In case of a <b>merger, acquisition, or sale</b> of assets (with
                notice)
              </li>
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              4. Data Security
            </Typography>
            <Typography lineHeight={1.0} mb={1}>
              We implement industry-standard safeguards including:
            </Typography>
            <Typography ml={2}>
              <li>Encryption of data in transit and at rest</li>
              <li>Role-based access controls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Secure user authentication mechanisms</li>
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              5. Data Retention
            </Typography>
            <Typography lineHeight={1.0} mb={1}>
              We retain your data:
            </Typography>
            <Typography ml={2}>
              <li>As long as your organization is actively using Belcka ERP</li>
              <li>As required by law or internal policy</li>
              <li>
                You can request deletion of your data, subject to
                contractual/legal obligations
              </li>
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              6. Your Rights
            </Typography>
            <Typography lineHeight={1.0} mb={1}>
              Depending on your jurisdiction, you may have the right to:
            </Typography>
            <Typography ml={2}>
              <li>Access the data we store about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal data</li>
              <li>Withdraw consent (where processing is based on consent)</li>
            </Typography>
            <Typography mt={1}>
              You can exercise these rights by contacting us at 
              <a href="#" > [support@belcka.com]</a>
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              7. Third-Party Integrations
            </Typography>
            <Typography mb={1}>
              Belcka may integrate with third-party tools (e.g., calendar apps,
              payment processors). These platforms have their own privacy
              policies. We recommend reviewing them before use.
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              8. Children&#39;s Privacy
            </Typography>
            <Typography mb={1}>
              Belcka ERP is not intended for use by individuals under the age of
              18. We do not knowingly collect data from children.
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              9. Changes to This Privacy Policy
            </Typography>
            <Typography mb={1}>
              We may update this Privacy Policy periodically. Changes will be
              posted within the app and on our website. Continued use of the
              platform after updates constitutes your acceptance.
            </Typography>
            <Typography
              variant="h2"
              mt={1}
              mb={2}
              lineHeight={1.4}
              fontWeight={700}
            >
              10. Contact Us
            </Typography>
            <Typography mb={1}>
              If you have any questions, concerns, or requests regarding this
              <b> Privacy Policy:</b>
            </Typography>
            <Typography>
              <b>Belcka</b>  
              <Typography style={{ display: "flex", alignItems:"center"}}> Email: <a href="#" style={{ display: "flex", alignItems:"center"}}> [support@belcka.com]</a></Typography> 
              <Typography style={{ display: "flex", alignItems:"center"}}>Website: <a href="#" style={{ display: "flex", alignItems:"center"}}> [www.belcka.com]</a></Typography>
            </Typography>
          </Grid>
        </Grid>
      </Box>
      <Box
        bgcolor="primary.light"
        borderRadius={0}
        sx={{
          paddingTop: {
            xs: "20px",
            lg: "20px",
          },
          paddingBottom: {
            xs: "20px",
            lg: "30px",
          },
        }}
      ></Box>
    </Box>
  );
}
