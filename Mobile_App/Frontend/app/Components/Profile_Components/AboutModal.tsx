import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Dimensions,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomHeader from './CustomHeader';

const { width, height } = Dimensions.get('window');

const AboutModal = ({ 
  visible, 
  onClose, 
  onSave, 
  currentAbout,
  updating
}) => {
  const [selectedAbout, setSelectedAbout] = useState(currentAbout || '');
  const [isEditing, setIsEditing] = useState(false);
  const [customAbout, setCustomAbout] = useState('');

  const aboutOptions = [
    'Available',
    'Busy',
    'At school',
    'At the movies',
    'At work',
    'Battery about to die',
    'Can\'t talk, WhatsApp only',
    'In a meeting',
    'At the gym',
    'Sleeping',
    'Urgent calls only'
  ];

  const handleSave = () => {
    if (isEditing && customAbout.trim()) {
      onSave(customAbout);
    } else if (selectedAbout) {
      onSave(selectedAbout);
    }
    setIsEditing(false);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>About</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View> */}
          <CustomHeader
          title="About"
          onBackPress={onClose}
          />

          <View style={styles.currentStatusContainer}>
            <Text style={styles.currentStatusLabel}>Currently set to</Text>
            <Text style={styles.currentStatusText}>
              {currentAbout || 'Not set'}
            </Text>
          </View>

          {isEditing ? (
            <View style={styles.editContainer}>
              <Text style={styles.sectionTitle}>Add About</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Type your custom status"
                value={customAbout}
                onChangeText={setCustomAbout}
                autoFocus={true}
              />
              <View style={styles.editButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={updating || !customAbout.trim()}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Select About</Text>
              <ScrollView style={styles.optionsContainer}>
                {aboutOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionItem,
                      selectedAbout === option && styles.selectedOption
                    ]}
                    onPress={() => setSelectedAbout(option)}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                    {selectedAbout === option && (
                      <MaterialIcons name="check" size={20} color="#0758C2" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Add Custom About</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
                disabled={updating || !selectedAbout}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save About</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    height: height * 0.7,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  currentStatusContainer: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentStatusLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  currentStatusText: {
    fontSize: 16,
    color: '#37475A',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 15,
    marginLeft: 5,
  },
  optionsContainer: {
    maxHeight: height * 0.4,
    marginBottom: 15,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
  },
  selectedOption: {
    backgroundColor: '#f0f7ff',
  },
  optionText: {
    fontSize: 16,
    color: '#37475A',
  },
  editContainer: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#37475A',
    fontSize: 16,
    fontWeight: '500',
  },
  editButton: {
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0758C2',
  },
  editButtonText: {
    color: '#0758C2',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0758C2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AboutModal;