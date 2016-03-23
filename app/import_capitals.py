#This script inserts the capitals and other data into table 'capitals' (in airports database).
#The csv file 'capitals.csv' made from 'capitals.json' by another script 'capitals_from_json.py'

import psycopg2
import csv

#connect to the postgres database
conn = psycopg2.connect("dbname=airports user=jharvard")

#open a cursor to perform operations
cur = conn.cursor()

#count imported rows
count = 0

#open csv file
with open('../capitals.csv', 'rb') as csvfile:
    capitals_reader = csv.reader(csvfile)
    #read each line of the file and split it with commas
    for row in capitals_reader:
        sql = "INSERT INTO capitals(country_common, country_official, capital, currency, region, subregion) VALUES (%s, %s, %s, %s, %s, %s);"
        data = (row[0], row[1], row[2], row[3], row[4], row[5])
        cur.execute(sql, data)
        count += 1



print count
#print some data from first rows
cur.execute("SELECT * FROM capitals;")
cur.fetchmany(4)

#save the changes
conn.commit()

#close connection with database
cur.close()
conn.close()


