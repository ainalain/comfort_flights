#This file makes a list of 50 largest countries in the world
#from here: http://www.geohive.com/earth/area_top50.aspx
#I need this list for my markers' clusterer's code
#if 'wanted' country is in the list, the maxZoom of clusterer will be less than if the country is small (not in the list)
#Then I import these 50 countries into my airports db, table 'largest_countries'

import psycopg2
import csv
#import json

#list of largest countries
countries = []

#count imported rows
count = 0
#extract 50 countries' names from file
with open('countries_by_size.txt') as f:
    for line in f:
        line = line.split('\t')
        print line
        countries.append(line[1])

    print 'Countries: ', countries

#connect to the postgres database
conn = psycopg2.connect("dbname=airports user=jharvard")

#open a cursor to perform operations
cur = conn.cursor()

for row in countries:
    sql = "INSERT INTO largest_countries(country) VALUES(%s);"
    data = (row, )
    cur.execute(sql, data)
    count += 1

print count
#save the changes
conn.commit()

#close connection with database
cur.close()
conn.close()
