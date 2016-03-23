#This scrypt converts file with all countries and their capitals in json into csv file for future table of capitals.
#File capitals.json is from GitHub: https://github.com/mledoze/countries
#file has name countries.json but I have renamed it into capitals.json

import json
import csv
import unicodedata

#define a function which would remove all diacritics from country like Cote d'Ivoire
#it's necessary because our database of airports has not diacritics
def remove_accents(input_str):
    nkfd_form = unicodedata.normalize('NFKD', input_str)
    return u"".join([c for c in nkfd_form if not unicodedata.combining(c)])

with open('capitals.json') as json_data:
    d = json.load(json_data)
    print 'Type: ', type(d)
    json_data.close()
l = []
print d[0]["name"]["common"]
print d[5]["capital"]
for item in d:
    common = remove_accents(item["name"]["common"])
    official = remove_accents(item["name"]["official"])
    currency = item["currency"]
    capital = remove_accents(item["capital"])
    region = remove_accents(item["region"])
    subregion = remove_accents(item["subregion"])
    small_dict = {"common":common, "official":official, "currency":currency, "capital":capital,
                  "region":region, "subregion":subregion}
    l.append(small_dict)

f = csv.writer(open("capitals.csv", "wb+"))

for x in l:
    f.writerow([x["common"],
               x["official"],
               x["capital"],
               x["currency"],
               x["region"],
               x["subregion"]])




