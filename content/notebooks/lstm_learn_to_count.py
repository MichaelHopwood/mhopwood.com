# What about with an LSTM? Just curious..
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import LabelBinarizer

X = np.array([0,1,2,3,4,5,6,7,8,9]*100 + [3])

n_numbers_prior = 2
n_numbers_jump = 3

# Encode the 10 digits into one-hot-encoded vectors
lb = LabelBinarizer()
X_lb = lb.fit_transform(X)

# Split for
X_samples = []
y_samples = []
for i in np.arange(0,len(X),n_numbers_jump):
    if i-n_numbers_prior > 0:
        y = X_lb[i]
        x = X_lb[i-n_numbers_prior:i]
        X_samples.append(x)
        y_samples.append(y)

X_samples = np.array(X_samples)
y_samples = np.array(y_samples)

model = keras.Sequential()
model.add(layers.InputLayer(input_shape=(n_numbers_prior,10), batch_size=None))
model.add(layers.LSTM(4, return_sequences=False))
model.add(layers.Dense(10, activation='softmax'))
model.summary()
model.compile(loss="binary_crossentropy",
              optimizer=keras.optimizers.SGD(learning_rate=1.5))
model.fit(X_samples, y_samples)

print(X_samples[10:13])
print(model.predict(X_samples[10:13]))
