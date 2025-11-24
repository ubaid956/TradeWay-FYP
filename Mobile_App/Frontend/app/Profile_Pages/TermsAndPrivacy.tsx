import React from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Linking,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { globalStyles } from '@/Styles/globalStyles';
import CustomHeader from '../Components/Headers/CustomHeader';
import { router } from 'expo-router';

const { height, width } = Dimensions.get('window');

const TermsAndPrivacy = () => {

  const openEmail = () => {
    Linking.openURL('mailto:support@tradeway.com');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>

      <CustomHeader
        title="Terms & Privacy"
        onBackPress={() => router.back()}
      />
      <ScrollView
        style={globalStyles.container}
        contentContainerStyle={styles.contentContainer}
      >



        {/* Content */}
        <View style={styles.content}>
          {/* Introduction */}
          <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.sectionText}>
            Welcome to TradeWay, your premier marketplace for marble, granite, and construction materials trading. By using our platform, you agree to these terms and privacy policy. TradeWay connects vendors, buyers, and service providers in the construction materials industry.
          </Text>

          {/* Data Collection */}
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <Text style={styles.subSectionTitle}>What We Collect</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Account Information:</Text> Name, email, phone number, profile details, role (vendor/buyer/driver), and KYC verification documents.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Product & Business Data:</Text> Product listings, specifications, pricing, images, location data, and business communications.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Device & Location Information:</Text> Device type, operating system, location data for product listings, and app usage analytics.
            </Text>
          </View>

          <Text style={styles.subSectionTitle}>How We Use Your Data</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>To facilitate trading, bidding, and marketplace operations</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>To verify user identity and prevent fraud in transactions</Text>
          </View>

          {/* Data Security */}
          <Text style={styles.sectionTitle}>Data Security</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Transaction Security:</Text> All financial transactions and sensitive business data are encrypted and protected.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Data Protection:</Text> All user data, product information, and business communications are stored securely using industry-standard encryption.
            </Text>
          </View>

          {/* TradeWay Specific Terms */}
          <Text style={styles.sectionTitle}>TradeWay Marketplace Terms</Text>
          <Text style={styles.subSectionTitle}>User Roles & Responsibilities</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Vendors:</Text> Responsible for accurate product listings, quality assurance, and timely delivery of goods.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Buyers:</Text> Responsible for honest bidding, timely payments, and providing accurate delivery information.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Drivers:</Text> Responsible for safe transportation of goods and maintaining professional service standards.
            </Text>
          </View>

          <Text style={styles.subSectionTitle}>Product Listings & Bidding</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              All product listings must be accurate and include proper specifications, pricing, and availability.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              Bidding is binding once placed. Withdrawal may be subject to penalties.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              TradeWay reserves the right to verify product authenticity and quality.
            </Text>
          </View>

          <Text style={styles.subSectionTitle}>KYC Verification & Compliance</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              All users must complete KYC verification to access full platform features.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              Verification documents are securely stored and used only for compliance purposes.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              TradeWay complies with local and international trade regulations.
            </Text>
          </View>

          <Text style={styles.subSectionTitle}>Payment & Transaction Terms</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              All transactions are processed securely through verified payment methods.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              TradeWay may charge service fees for successful transactions.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              Disputes between users should be resolved through our support system.
            </Text>
          </View>

          {/* User Rights */}
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Access & Correction:</Text> You can access, update, and manage your profile, product listings, and business information at any time.
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Data Deletion:</Text> You can request deletion of your account, product listings, and associated business data.
            </Text>
          </View>

          {/* Prohibited Activities */}
          <Text style={styles.sectionTitle}>Prohibited Activities</Text>
          <Text style={styles.sectionText}>
            The following activities are strictly prohibited on TradeWay:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, styles.prohibited]}>❌</Text>
            <Text style={[styles.sectionText, styles.prohibitedText]}>
              Fraudulent product listings, fake reviews, or misleading information
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, styles.prohibited]}>❌</Text>
            <Text style={[styles.sectionText, styles.prohibitedText]}>
              Price manipulation, bid rigging, or unfair trading practices
            </Text>
          </View>

          {/* Contact */}
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these terms, privacy policy, or need support with your TradeWay account, please contact us:
          </Text>
          <TouchableOpacity onPress={openEmail}>
            <Text style={styles.emailText}>support@tradeway.com</Text>
          </TouchableOpacity>

          {/* Acceptance */}
          <Text style={styles.acceptanceText}>
            By using TradeWay, you acknowledge that you have read and agree to these terms and privacy policy. You understand that TradeWay is a marketplace platform and we are not responsible for the quality, authenticity, or delivery of products traded between users.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: height * 0.05,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: width * 0.03,
  },
  headerTitle: {
    fontSize: width * 0.045,
    color: '#37475A',
  },
  content: {
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.02,
  },
  lastUpdated: {
    fontSize: width * 0.03,
    color: '#666',
    textAlign: 'right',
    marginBottom: height * 0.02,
  },
  sectionTitle: {
    fontSize: width * 0.04,
    fontWeight: '700',
    color: '#37475A',
    marginTop: height * 0.03,
    marginBottom: height * 0.01,
  },
  subSectionTitle: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: '#37475A',
    marginTop: height * 0.02,
    marginBottom: height * 0.01,
  },
  sectionText: {
    fontSize: width * 0.035,
    lineHeight: height * 0.025,
    color: '#666',
    marginBottom: height * 0.01,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: height * 0.005,
    alignItems: 'flex-start',
  },
  bullet: {
    marginRight: width * 0.02,
    color: '#666',
  },
  boldText: {
    fontWeight: '600',
    color: '#37475A',
  },
  prohibited: {
    color: '#ff4444',
  },
  prohibitedText: {
    color: '#ff4444',
  },
  emailText: {
    fontSize: width * 0.035,
    color: '#0758C2',
    marginVertical: height * 0.01,
  },
  acceptanceText: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: '#37475A',
    marginTop: height * 0.04,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TermsAndPrivacy;