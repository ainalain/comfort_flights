#This script insert all airports data into our main table 'airports' (in the database "airports")


import psycopg2
import csv

#connect to the postgres database
conn = psycopg2.connect("dbname=airports user=jharvard")

#open a cursor to perform operations
cur = conn.cursor()

#count imported rows
count = 0

#open csv file
with open('../openflights_db/airports.dat', 'rb') as csvfile:
    airports_reader = csv.reader(csvfile)
    #read each line of the file and split it with commas
    for row in airports_reader:
        sql = "INSERT INTO airports(name, city, country, iata_faa, icao, latitude,longitude, timezone) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);"
        data = (row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[11])
        cur.execute(sql, data)
        count += 1



print count
#print some data from first rows
cur.execute("SELECT * FROM airports;")
cur.fetchmany(4)

#save the changes
conn.commit()

#close connection with database
cur.close()
conn.close()


