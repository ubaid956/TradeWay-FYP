import { View, Text, Dimensions, Alert } from 'react-native'
import React from 'react'
import LoginHeader from '../Components/LoginHeader'
import InputField from '../Components/InputFiled'
import { globalStyles } from '@/Styles/globalStyles'
import CustomButton from '../Components/CustomButton'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { useRoute } from '@react-navigation/native'
import { useNavigation } from '@react-navigation/native'
const { height } = Dimensions.get('window')

const PasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(6, 'Password too short')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords do not match')
    .required('Confirm Password is required'),
})

const NewPassword = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const userId = route.params?.userId

  const handleReset = async (values, { resetForm }) => {
    try {
      const response = await fetch('https://3d488f18f175.ngrok-free.app/api/auth/users/updatePassword', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          newPassword: values.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        Alert.alert('Reset Failed', data.message || 'Unable to reset password')
        return
      }

      Alert.alert('Success', 'Password Reset Successful!')
      resetForm()
      navigation.navigate('Signup-Login/Login')
      // Optionally navigate to login screen here
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
      console.error('Password reset error:', error)
    }
  }

  return (
    <View>
      <LoginHeader
        title="New Password"
        subtitle="Create a new password for your account"
        onPress={() => { }}
      />

      <Formik
        initialValues={{ password: '', confirmPassword: '' }}
        validationSchema={PasswordSchema}
        onSubmit={handleReset}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          isValid,
          dirty,
        }) => (
          <View>
            <InputField
              placeholder="Password"
              icon="lock-closed"
              isPassword
              value={values.password}
              onChangeText={handleChange('password')}
              onBlur={handleBlur('password')}
            />
            {touched.password && errors.password && (
              <Text style={globalStyles.error}>{errors.password}</Text>
            )}

            <InputField
              placeholder="Confirm Password"
              icon="lock-closed"
              isPassword
              value={values.confirmPassword}
              onChangeText={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <Text style={globalStyles.error}>{errors.confirmPassword}</Text>
            )}

            <Text style={[globalStyles.msgText, { marginBottom: height * 0.03, marginTop: height * 0.01 }]}>
              Password must be at least 6 characters with letters and numbers
            </Text>

            <CustomButton
              title="Reset Password"
              onPress={handleSubmit}
              disabled={!(isValid && dirty)} // 🔒 Button disabled unless valid & touched
            />
          </View>
        )}
      </Formik>
    </View>
  )
}

export default NewPassword
