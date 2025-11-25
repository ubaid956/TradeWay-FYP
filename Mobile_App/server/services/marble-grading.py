# %%
import numpy as np
import pandas as pd
import os
import matplotlib.pyplot as plt
import tensorflow as tf
import random

from tensorflow.keras.utils import to_categorical
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.python.keras.preprocessing.image import ImageDataGenerator

from sklearn.metrics import classification_report, log_loss, accuracy_score
from sklearn.model_selection import train_test_split
from tqdm import tqdm

# %%
data_dir = '../input/marble-surface-anomaly-detection/marble/'

# %%
Name=[]
for file in os.listdir(data_dir):
    Name+=[file]
print(Name)
print(len(Name))

# %%
N=[]
for i in range(len(Name)):
    N+=[i]
    
normal_mapping=dict(zip(Name,N)) 
reverse_mapping=dict(zip(N,Name)) 

# %%
datax0=[]
datay0=[]
count=0
for file in Name:
    path=os.path.join(data_dir,file)
    for im in tqdm(os.listdir(path)):
        image=load_img(os.path.join(path,im), grayscale=False, color_mode='rgb', target_size=(48,48))
        image=img_to_array(image)
        image=image/255.0
        datax0.append(image)
        datay0.append(count)
    count=count+1

# %%
n=len(datax0)
M=[]
for i in range(n):
    M+=[i]
random.shuffle(M)

# %%
datax1=np.array(datax0)
datay1=np.array(datay0)

# %%
trainx1=datax1[M[0:(n//4)*3]]
trainy1=datay1[M[0:(n//4)*3]]
testx1=datax1[M[(n//4)*3:]]
testy1=datay1[M[(n//4)*3:]]

# %%
trainy2=to_categorical(trainy1)
y_train=np.array(trainy2)

# %%
X_train=np.array(trainx1).reshape(-1,48,48,3)
X_test=np.array(testx1).reshape(-1,48,48,3)

# %%
trainx,testx,trainy,testy=train_test_split(X_train,y_train,test_size=0.2,random_state=44)

# %%
print(trainx.shape)
print(testx.shape)
print(trainy.shape)
print(testy.shape)

# %%
datagen = ImageDataGenerator(horizontal_flip=True,vertical_flip=True,rotation_range=20,zoom_range=0.2,
                        width_shift_range=0.2,height_shift_range=0.2,shear_range=0.1,fill_mode="nearest")

# %%
pretrained_model3 = tf.keras.applications.DenseNet201(input_shape=(48,48,3),include_top=False,weights='imagenet',pooling='avg')
pretrained_model3.trainable = False

# %%
inputs3 = pretrained_model3.input
x3 = tf.keras.layers.Dense(128, activation='relu')(pretrained_model3.output)
outputs3 = tf.keras.layers.Dense(2, activation='softmax')(x3)
model = tf.keras.Model(inputs=inputs3, outputs=outputs3)

# %%
model.compile(optimizer='adam',loss='categorical_crossentropy',metrics=['accuracy'])

# %%
his=model.fit(datagen.flow(trainx,trainy,batch_size=32),validation_data=(testx,testy),epochs=50)

# %%
y_pred=model.predict(testx)
pred=np.argmax(y_pred,axis=1)
ground = np.argmax(testy,axis=1)
print(classification_report(ground,pred))

# %%
get_acc = his.history['accuracy']
value_acc = his.history['val_accuracy']
get_loss = his.history['loss']
validation_loss = his.history['val_loss']

epochs = range(len(get_acc))
plt.plot(epochs, get_acc, 'r', label='Accuracy of Training data')
plt.plot(epochs, value_acc, 'b', label='Accuracy of Validation data')
plt.title('Training vs validation accuracy')
plt.legend(loc=0)
plt.figure()
plt.show()

# %%
epochs = range(len(get_loss))
plt.plot(epochs, get_loss, 'r', label='Loss of Training data')
plt.plot(epochs, validation_loss, 'b', label='Loss of Validation data')
plt.title('Training vs validation loss')
plt.legend(loc=0)
plt.figure()
plt.show()

# %%
path0='../input/marble-surface-anomaly-detection/marble/defect/IMG_20210531_172937_LL.jpg'
load_img(path0,target_size=(300,300))

# %%
image=load_img(path0,target_size=(48,48))

image=img_to_array(image) 
image=image/255.0
prediction_image=np.array(image)
prediction_image= np.expand_dims(image, axis=0)

# %%
prediction=model.predict(prediction_image)
value=np.argmax(prediction)
move_name=reverse_mapping[value]
print("Prediction is {}.".format(move_name))

# %%
pred2=model.predict(X_test)
print(pred2[0:10])

PRED=[]
for item in pred2:
    value2=np.argmax(item)      
    PRED+=[value2]
print(PRED[0:10])

# %%
ANS=list(testy1)
ANS[0:10]

# %%
accuracy=accuracy_score(ANS,PRED)
print(accuracy)

# %%


# %%



