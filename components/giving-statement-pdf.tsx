import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts (optional - using system fonts by default)
// Font.register({
//   family: 'Roboto',
//   src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
// });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: "2 solid #333",
  },
  churchName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1a1a1a",
  },
  churchAddress: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  churchContact: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  ein: {
    fontSize: 9,
    color: "#333",
    marginTop: 5,
    fontWeight: "bold",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 15,
    color: "#1a1a1a",
  },
  statementInfo: {
    fontSize: 9,
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
    backgroundColor: "#f5f5f5",
    padding: 5,
  },
  donorInfo: {
    fontSize: 10,
    marginBottom: 3,
    color: "#333",
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #333",
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #ddd",
    paddingVertical: 6,
    fontSize: 9,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
    fontSize: 9,
  },
  tableTotalRow: {
    flexDirection: "row",
    borderTop: "2 solid #333",
    paddingTop: 8,
    marginTop: 5,
    fontWeight: "bold",
    fontSize: 10,
  },
  colDate: {
    width: "20%",
  },
  colCategory: {
    width: "50%",
  },
  colAmount: {
    width: "30%",
    textAlign: "right",
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f9f9f9",
    border: "1 solid #ddd",
    fontSize: 8,
    lineHeight: 1.5,
    color: "#333",
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: "1 solid #ddd",
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  summarySection: {
    marginTop: 10,
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f5f5f5",
    border: "1 solid #ddd",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    fontSize: 9,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1 solid #333",
    fontSize: 11,
    fontWeight: "bold",
  },
});

interface GivingItem {
  dateGiven: string;
  categoryName: string;
  amount: number;
}

interface CategoryTotal {
  categoryName: string;
  total: number;
}

interface GivingStatementPDFProps {
  church: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    is501c3?: boolean | null;
    taxStatementDisclaimer?: string | null;
    goodsServicesProvided?: boolean | null;
    goodsServicesStatement?: string | null;
  };
  household: {
    name: string;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  year: number;
  startDate: string;
  endDate: string;
  items: GivingItem[];
  categoryTotals: CategoryTotal[];
  totalAmount: number;
  statementNumber?: string | null;
  generatedDate: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

export const GivingStatementPDF: React.FC<GivingStatementPDFProps> = ({
  church,
  household,
  year,
  startDate,
  endDate,
  items,
  categoryTotals,
  totalAmount,
  statementNumber,
  generatedDate,
}) => {
  // Build default disclaimer if not provided
  const defaultDisclaimer = `This letter acknowledges that ${church.name} is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code${church.taxId ? `. Our Employer Identification Number (EIN) is ${church.taxId}` : ""}.

${church.goodsServicesProvided 
  ? (church.goodsServicesStatement || "Goods or services were provided in exchange for your contributions. Please see the details above for the fair market value of items received.")
  : "No goods or services were provided in exchange for your contributions, except for intangible religious benefits."
}

Please retain this statement for your tax records.`;

  const disclaimer = church.taxStatementDisclaimer || defaultDisclaimer;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header - Church Information */}
        <View style={styles.header}>
          <Text style={styles.churchName}>{church.name}</Text>
          {church.address && (
            <Text style={styles.churchAddress}>{church.address}</Text>
          )}
          {(church.city || church.state || church.zip) && (
            <Text style={styles.churchAddress}>
              {[church.city, church.state, church.zip]
                .filter(Boolean)
                .join(", ")}
            </Text>
          )}
          {church.phone && (
            <Text style={styles.churchContact}>Phone: {church.phone}</Text>
          )}
          {church.email && (
            <Text style={styles.churchContact}>Email: {church.email}</Text>
          )}
          {church.taxId && (
            <Text style={styles.ein}>EIN: {church.taxId}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>DONOR CONTRIBUTION STATEMENT</Text>
        
        {/* Statement Info */}
        <View style={styles.statementInfo}>
          {statementNumber && (
            <Text>Statement Number: {statementNumber}</Text>
          )}
          <Text>Tax Year: {year}</Text>
          <Text>
            Period: {formatDate(startDate)} - {formatDate(endDate)}
          </Text>
          <Text style={{ marginTop: 5 }}>
            Generated: {formatDate(generatedDate)}
          </Text>
        </View>

        {/* Donor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared For:</Text>
          <Text style={styles.donorInfo}>{household.name}</Text>
          {household.address1 && (
            <Text style={styles.donorInfo}>{household.address1}</Text>
          )}
          {household.address2 && (
            <Text style={styles.donorInfo}>{household.address2}</Text>
          )}
          {(household.city || household.state || household.zip) && (
            <Text style={styles.donorInfo}>
              {[household.city, household.state, household.zip]
                .filter(Boolean)
                .join(", ")}
            </Text>
          )}
        </View>

        {/* Summary by Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contribution Summary by Category</Text>
          <View style={styles.summarySection}>
            {categoryTotals.map((cat, index) => (
              <View key={index} style={styles.summaryRow}>
                <Text>{cat.categoryName}</Text>
                <Text>{formatCurrency(cat.total)}</Text>
              </View>
            ))}
            <View style={styles.summaryTotal}>
              <Text>TOTAL CONTRIBUTIONS</Text>
              <Text>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Detailed Contributions Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Contributions</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.colDate}>Date</Text>
              <Text style={styles.colCategory}>Category</Text>
              <Text style={styles.colAmount}>Amount</Text>
            </View>
            
            {/* Table Rows */}
            {items.map((item, index) => (
              <View
                key={index}
                style={
                  index === items.length - 1
                    ? styles.tableRowLast
                    : styles.tableRow
                }
              >
                <Text style={styles.colDate}>{formatDate(item.dateGiven)}</Text>
                <Text style={styles.colCategory}>{item.categoryName}</Text>
                <Text style={styles.colAmount}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}

            {/* Total Row */}
            <View style={styles.tableTotalRow}>
              <Text style={styles.colDate}></Text>
              <Text style={styles.colCategory}>TOTAL</Text>
              <Text style={styles.colAmount}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.disclaimer}>
          <Text>{disclaimer}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            If you have questions about this statement, please contact us at:
          </Text>
          <Text>
            {church.email || church.phone || church.name}
          </Text>
          <Text style={{ marginTop: 10 }}>
            Thank you for your generous support of {church.name}.
          </Text>
        </View>
      </Page>
    </Document>
  );
};
