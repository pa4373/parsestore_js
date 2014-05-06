from parse_rest.connection import register
from parse_rest.datatypes import Object
import requests, time 
from json import loads
from lxml.html.soupparser import fromstring

base_url = 'http://getmore.cc/clothing/view/%s'

class Dress(Object):
    pass

def convert(dress_id):
    r = requests.get(base_url % dress_id)
    tree = fromstring(r.content)
    json = tree.xpath('//*[@id="clothing_json_data"]')[0].text
    data = loads(json)
    if data['product_type'] != u'12':
        print 'skip on %s' % dress_id
        return None
    options = {
        'name': data['product_title'],
        'status': data['item_status'],
        'size': data['size'],
        'comment': loads(data['descript']).get(u'\u9ede\u8a55', 'No data'),
        'originalPrice': int(data['product_original_price']),
        'price': int(data['product_sell_price']),
        'previewUrl': 'http://getmore.cc/upload/thumbs/250_375_%s' % data['pics'][0] 
    }
    dress = Dress(**options)
    dress.save()
    print 'success on %s' % dress_id 

if __name__ == '__main__':
    register('4sm6oolNwqCWoKLqHQLfAA0oPabqt8CLRVWpcZKg', 'B4tN0305Dbg4weXkXWulTzEsbM3G2hP22sWCUvTx')
    for i in range(87,779):
        try:
            convert(i)
            time.sleep(3)
        except:
            print 'error on %s' % i
            pass
    
