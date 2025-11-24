import { Dimensions, StyleSheet } from "react-native";

const { height, width } = Dimensions.get("window");
export const groupStyle = StyleSheet.create({
  container: { padding: 16, paddingBottom: 30, alignItems: 'center' },

  inputWrapper: {
    marginBottom: 15,
  },

  label: {
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 16,
    alignSelf: 'flex-start',
  },

  input: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    width: width * 0.9,
  },

  textarea: {
    height: 150,
    textAlignVertical: 'top',
    width: width * 0.9,
  },

  optionInput: {
    flex: 1,
    marginRight: 8,
    width: width * 0.75,
  },

  dateInput: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    width: width * 0.9,
  },

  dateText: { color: '#333', fontSize: 16 },

  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: width * 0.9,
  },

  removeOptionButton: {
    padding: 8,
  },

  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 8,
    width: width * 0.9,
    justifyContent: 'center',
  },

  addOptionIcon: {
    marginRight: 8,
    color: '#4F46E5',
  },

  addOptionText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 16,
  },

  //Card Styles
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    width: width * 0.75,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginVertical: 4,
    paddingBottom: height * 0.04, // Adjusted for better spacing

  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111',


  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.01,



  },
  cardText: {
    marginHorizontal: width * 0.01,
    color: '#555',
    fontSize: 13,
  },
  sentCard: {
    backgroundColor: '#694df0',
    marginRight: width * 0.01,
  },
  receivedCard: {
    backgroundColor: '#e4e6eb',
  },
  messageTime: {
    fontSize: 12,
    position: 'absolute',
    bottom: 8,       // Distance from bottom of parent
    right: 8,        // Distance from right edge of parent

  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    // backgroundColor:'red',


  },

  title: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111',

  },

})