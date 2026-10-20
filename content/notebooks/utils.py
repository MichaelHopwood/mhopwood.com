from PIL import Image
from IPython.display import display
import os
import numpy as np

def disp(filename, filepath='_static', factor=1):
    pil_im = Image.open(os.path.join(filepath,filename))

    if factor != 1:
        size_tuple = pil_im.size
        size_tuple = tuple([int(a * factor) for a in size_tuple])

        x1 = y1 = 0
        x2, y2 = size_tuple

        # resize
        pil_im = pil_im.resize(size_tuple)

        # transform
        pil_im = pil_im.transform(size_tuple, Image.EXTENT, (x1,y1,x2,y2))

    display(pil_im)